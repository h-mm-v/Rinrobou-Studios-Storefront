import React, { useState } from "react";
import ProductCard from "../components/ProductCard";
import FilterTag from "../components/FilterTag";

const Filter_Tags = [
  "All Filters",
  "Under $50",
  "Limited Time",
  "Pre-Orders",
  "Holiday",
  "Prints",
];

const SearchResultsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState("All Filters");

  return (
    // Header Section
    <div className="bg-secondary min-vh-100 pb-5">
      <div className="container-fluid bg-secondary text-white text-center py-2">
        Announcement (Optional)
      </div>
      <div className="container-fluid bg-dark text-white py-5 text-center">
        Header Placeholder
      </div>

      <div className="container mt-4">
        {/* Search and Category Section */}
        <div className="d-flex align-items-center gap-3 mb-3">
          <button className="btn btn-outline-light d-flex align-items-center gap-2 text-nowrap">
            {"\u2630"} Categories
          </button>

          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search for anything"
            />
            <button className="btn btn-info text-dark" type="button">
              Icon
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div className="d-flex flex-wrap gap-2">
            {Filter_Tags.map((tag) => (
              <FilterTag
                key={tag}
                label={tag}
                isActive={activeFilter === tag}
                onClick={() => setActiveFilter(tag)}
              />
            ))}
          </div>
          {/* Sort Button (No Drop Down) */}
          <button className="btn btn-sm btn-outline-light d-flex align-items-center gap-1">
            <span>Most Relevant</span>
          </button>

          {/* Product Grids */}
          <div className="row g-4 mb-5">
            {Array.from({ length: 12 }).map((_, index) => (
              <ProductCard key={index} />
            ))}
          </div>
        </div>
        {/* Page Number */}
        <div className="d-flex justify-content-center align-items-center gap-2">
          <button className="btn btn-sm btn-outline-light rounded-circle">
            ←
          </button>
          {[1, 2, 3, 4, 5].map((page) => (
            <button
              key={page}
              className={`btn btn-sm rounded-circle ${
                page === 1 ? "btn-primary" : "btn-outline-light"
              }`}
            >
              {page}
            </button>
          ))}
          <button className="btn btn-sm btn-outline-light rounded-circle">
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
