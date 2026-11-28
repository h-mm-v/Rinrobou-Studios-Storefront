import express from "express";
import type { RowDataPacket } from "mysql2";
import { db } from "./db.js";
import path from "node:path";
import ts from "typescript";
import fs from "node:fs/promises";

const app = express();
const PORT = 3001;

interface ProductRow extends RowDataPacket {
    Product_ID: number;
    Product_Name: string;
    Category: string | null;
    Price: string;
    Waitlist_Active: number;
}

app.get("/api/products/:id", async (req, res) => {
    const productId = req.params.id;

    if (!/^[1-9]\d*$/.test(productId)) {
        res.status(400).json({ error: "Invalid product ID" });
        return;
    }

    try {
        const [rows] = await db.execute<ProductRow[]>(
            `SELECT
                Product_ID,
                Product_Name,
                Category,
                Price,
                Waitlist_Active
             FROM Product
             WHERE Product_ID = ?`,
            [productId]
        );

        if (rows.length === 0) {
            res.status(404).json({ error: "Product not found" });
            return;
        }

        const [images] = await db.execute<RowDataPacket[]>(
            `SELECT Image_Path
             FROM ProductImage
             WHERE Product_ID = ?
             ORDER BY Display_Order, Image_ID`,
            [productId]
        );

        const [details] = await db.execute<RowDataPacket[]>(
            `SELECT Detail_Text
             FROM ProductDetail
             WHERE Product_ID = ?
             ORDER BY Display_Order, Detail_ID`,
            [productId]
        );

        const [reviews] = await db.execute<RowDataPacket[]>(
            `SELECT
                Review_ID,
                Reviewer_Name,
                Review_Rating,
                Review_Text,
                Review_Date,
                Review_ImagePath
             FROM ProductReview
             WHERE Product_ID = ?
             ORDER BY Review_Date DESC, Review_ID DESC`,
            [productId]
        );

        const product = rows[0];

        res.json({
            id: product.Product_ID,
            name: product.Product_Name,
            category: product.Category,
            price: Number(product.Price),
            waitlistActive: Boolean(product.Waitlist_Active),

            images: images.map(row => row.Image_Path),
            details: details.map(row => row.Detail_Text),

            reviews: reviews.map(row => ({
                id: row.Review_ID,
                name: row.Reviewer_Name,
                rating: Number(row.Review_Rating),
                text: row.Review_Text,
                date: row.Review_Date,
                image: row.Review_ImagePath
            }))
        });

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({
            error: "Unable to retrieve product"
        });
    }
});

app.get("/api/health", async (_req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ status: "connected" });
    } catch (error) {
        console.error(error);
        res.status(503).json({ status: "disconnected" });
    }
});

const projectRoot = process.cwd();

app.get("/product.html", (_req, res) => {
    res.sendFile(path.join(projectRoot, "product.html"));
});

app.get("/product.css", (_req, res) => {
    res.sendFile(path.join(projectRoot, "product.css"));
});

app.get("/style.css", (_req, res) => {
    res.sendFile(path.join(projectRoot, "style.css"));
});

app.get("/product.ts", async (_req, res) => {
    try {
        const source = await fs.readFile(
            path.join(projectRoot, "product.ts"),
            "utf8"
        );

        const result = ts.transpileModule(source, {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext
            },
            fileName: "product.ts"
        });

        res.type("application/javascript");
        res.send(result.outputText);

    } catch (error) {
        console.error("TypeScript error:", error);

        res.status(500).send(
            "Unable to load Product TypeScript"
        );
    }
});

app.use(
    "/src/assets",
    express.static(
        path.join(projectRoot, "src", "assets"),
        {
            index: false,
            dotfiles: "deny"
        }
    )
);

app.listen(PORT, "127.0.0.1", () => {
    console.log(
        `Product page running at http://localhost:${PORT}`
    );
});
