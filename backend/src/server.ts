import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  connectionLimit: 10,
});

const PORT = Number(process.env.PORT) || 3000;



app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const requestedPageSize = Number(req.query.pageSize) || 12;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(requestedPageSize, 12);

    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const format = String(req.query.format || "").trim();
    const color = String(req.query.color || "").trim();
    const popular = String(req.query.popular || "").trim();

    const maxPrice = Number(req.query.maxPrice);

    if (search) {
      conditions.push("(name LIKE ? OR category LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      conditions.push("category = ?");
      values.push(category);
    }

    if (format) {
      conditions.push("item_format = ?");
      values.push(format);
    }

    if (color) {
      conditions.push("color = ?");
      values.push(color);
    }

    if (!Number.isNaN(maxPrice) && maxPrice > 0) {
      conditions.push("price <= ?");
      values.push(maxPrice);
    }

    if (req.query.limitedTime === "true") {
      conditions.push("is_limited_time = TRUE");
    }

    if (req.query.preOrders === "true") {
      conditions.push("is_preorder = TRUE");
    }

    if (req.query.holiday === "true") {
      conditions.push("is_holiday = TRUE");
    }

    if (popular === "best-sellers") {
      conditions.push("review_count >= 20");
    }

    if (popular === "five-stars") {
      conditions.push("rating >= 5");
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const sort = String(req.query.sort || "relevant");

    const orderBy =
      sort === "price-low"
        ? "price ASC"
        : sort === "price-high"
          ? "price DESC"
          : sort === "newest"
            ? "created_at DESC"
            : "review_count DESC";

    const [products] = await pool.execute(
      `
      SELECT
        id,
        name,
        category,
        item_format,
        price,
        color,
        rating,
        review_count,
        badge,
        image_path,
        is_limited_time,
        is_preorder,
        is_holiday
      FROM products
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
      `,
      [...values, pageSize, offset]
    );

    const [countRows] = await pool.execute(
      `
      SELECT COUNT(*) AS total
      FROM products
      ${whereClause}
      `,
      values
    );

    const total = Number(
      (countRows as { total: number }[])[0].total
    );

    res.json({
      products,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Product query failed:", error);

    res.status(500).json({
      error: "Unable to load products.",
    });
  }
});
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});