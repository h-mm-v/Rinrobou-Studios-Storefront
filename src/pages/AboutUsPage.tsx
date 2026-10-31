import React from "react";

const AboutUsPage: React.FC = () => {
  return (
    //Background Color
    <div className="bg-secondary min-vh-100">
      {/* Header Section */}
      <div className="container-fluid bg-secondary text-bg-primary text-center">
        Announcement (Optional)
      </div>
      <div className="container-fluid bg-dark text-white py-5 text-center">
        Header Placeholder
      </div>

      {/* Who We Are Section */}
      <div className="container-md pt-5">
        <div className="bg-dark py-5 rounded border">
          <div className="row align-items-center justify-content-center g-5">
            <div className="col-md-4 col-lg-3">
              <div
                className="bg-dark text-white d-flex align-items-center justify-content-center rounded shadow-sm border border-light"
                style={{ aspectRatio: "1 / 1" }}
              >
                Image Placeholder
              </div>
            </div>
            <div className="col-md-8 col-lg-6 text-white">
              <h2 className="h4 fw-bold mb-3"> Who We Are</h2>
              <p className="lead fs-6 mb-3">
                We're RinJ and Thief! A comfy art duo based in California.
              </p>
            </div>
          </div>
        </div>
        {/* What We Offer Section */}
        <div className="container mt-5 pt-4">
          <div className="text-center mb-5 text-white">
            <h2 className="fw-bold"> What We Offer </h2>
          </div>

          <div className="row g-4 justify-content-center text-center">
            {/* Anime Style */}
            <div className="col-6 col-md-3">
              <div
                className="bg-dark text-white d-flex align-items-center justify-content-center rounded shadow-sm border light mb-2"
                style={{ aspectRatio: " 1 / 1" }}
              >
                Image Placeholder
              </div>
              <span className="text-white fst-italic fw-semibold"> Anime </span>
            </div>
            {/* Chibi Style */}
            <div className="col-6 col-md-3">
              <div
                className="bg-dark text-white d-flex align-items-center justify-content-center rounded shadow-sm border light mb-2"
                style={{ aspectRatio: " 1 / 1" }}
              >
                Image Placeholder
              </div>
              <span className="text-white fst-italic fw-semibold"> Chibi </span>
            </div>
            {/* Half Chibi Style */}
            <div className="col-6 col-md-3">
              <div
                className="bg-dark text-white d-flex align-items-center justify-content-center rounded  border light mb-2"
                style={{ aspectRatio: " 1 / 1" }}
              >
                Image Placeholder
              </div>
              <span className="text-white fst-italic fw-semibold">
                {" "}
                Half-Chibi{" "}
              </span>
            </div>
            {/* Skeb Style */}
            <div className="col-6 col-md-3">
              <div
                className="bg-dark text-white d-flex align-items-center justify-content-center rounded shadow-sm border light mb-2"
                style={{ aspectRatio: " 1 / 1" }}
              >
                Image Placeholder
              </div>
              <span className="text-white fst-italic fw-semibold"> Skeb </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;
