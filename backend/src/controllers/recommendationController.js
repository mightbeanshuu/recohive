import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import Recommendation from "../models/Recommendation.js";
import { generateExplanation } from "../services/aiExplainer.js";
import { recommend } from "../services/recommendationEngine.js";
import { createShoppingAgent } from "../services/shoppingAgent.js";

const shoppingAgent = createShoppingAgent();

export const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await Recommendation.find({
      sourceProductId: req.params.productId,
    })
      .populate("recommendedProductId")
      .sort({ recommendationScore: -1 });

    return res.status(200).json({
      source: "cache",
      recommendations,
    });
  } catch (error) {
    return next(error);
  }
};

export const generateAndSave = async (req, res, next) => {
  try {
    const { productId, query, intent: bodyIntent } = req.body;
    if (!productId) {
      res.status(400);
      throw new Error("productId is required");
    }

    // AI shopping agent: turn a plain-English goal ("cheaper but in stock")
    // into a strict intent that steers the deterministic engine. The agent
    // never ranks; it only interprets. Falls back to a keyword parser.
    let intent = bodyIntent ?? {};
    let agent = { used: false };
    if (query) {
      const understood = await shoppingAgent.understand(query);
      intent = understood.intent;
      agent = { used: true, query, intent, source: understood.source };
    }

    const sourceProduct = await Product.findById(productId);
    if (!sourceProduct) {
      res.status(404);
      throw new Error("Product not found");
    }

    const candidates = await Product.find({
      category: sourceProduct.category,
      _id: { $ne: sourceProduct._id },
    });
    const inventories = await Inventory.find({
      productId: { $in: candidates.map(({ _id }) => _id) },
    }).lean();
    const inventoryMap = new Map(
      inventories.map(({ productId: id, availableQuantity }) => [
        id.toString(),
        availableQuantity,
      ])
    );
    const results = recommend(sourceProduct, candidates, inventoryMap, 5, intent);

    const recommendations = await Promise.all(
      results.map(async ({ product, score, tags, breakdown, serendipity }) => ({
        sourceProductId: sourceProduct._id,
        recommendedProductId: product._id,
        recommendationScore: score,
        reason: await generateExplanation(sourceProduct, product, tags),
        tags,
        breakdown, // causal per-factor point contributions
        serendipity: Boolean(serendipity),
      }))
    );

    const recommendedIds = recommendations.map(
      ({ recommendedProductId }) => recommendedProductId
    );
    const operations = [
      {
        deleteMany: {
          filter: {
            sourceProductId: sourceProduct._id,
            recommendedProductId: { $nin: recommendedIds },
          },
        },
      },
      ...recommendations.map((recommendation) => ({
        updateOne: {
          filter: {
            sourceProductId: recommendation.sourceProductId,
            recommendedProductId: recommendation.recommendedProductId,
          },
          update: { $set: recommendation },
          upsert: true,
        },
      })),
    ];

    await Recommendation.bulkWrite(operations);

    const populated = await Recommendation.find({
      sourceProductId: sourceProduct._id,
    })
      .populate("recommendedProductId")
      .sort({ recommendationScore: -1 });

    // Merge the live causal breakdown + serendipity flags onto the populated
    // docs so the UI can render the "why this score" waterfall and discovery.
    const enrichMap = new Map(recommendations.map((r) => [r.recommendedProductId.toString(), r]));
    const enriched = populated.map((doc) => {
      const extra = enrichMap.get(doc.recommendedProductId._id.toString());
      return { ...doc.toObject(), breakdown: extra?.breakdown, serendipity: extra?.serendipity ?? false };
    });

    return res.status(201).json({
      source: "generated",
      agent, // the AI agent's parsed intent (or { used: false })
      recommendations: enriched,
    });
  } catch (error) {
    return next(error);
  }
};
