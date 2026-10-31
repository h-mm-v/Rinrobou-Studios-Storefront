import React from "react";

interface ProductCardProps {
  title?: string;
  price?: string;
  artStyle?: string;
  rating?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title = "Product",
  price = "$50.00",
  artStyle = "Art Style",
  rating = "***** (10)",
}) => {
  return (
    <div className="col-6 col-md-3">
      <div className="card bg-dark text-white h-100 border-0">
        <div
          className="bg-secondary d-flex align-items-center justify-content-center rounded-top border border-dark"
          style={{ aspectRatio: "1 / 1" }}
        >
          Image Placeholder
        </div>

        {/* Product Card */}
        <div className="card-body d-flex flex-column text-center p-3">
          <span className="badge bg-light text-dark align-self-center mb-1">
            {artStyle}
          </span>
          <h6 className="card-title fw-bold mb-1 small">{title}</h6>
          <p className="text-warning small mb-1">{rating}</p>
          <p className="fw-bold mb-3">{price}</p>

          <button className="btn btn-sm btn-outline-light mt-auto w-100">
            ADD TO BAG
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
