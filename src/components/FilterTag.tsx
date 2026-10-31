import React from "react";

export interface FilterProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isActive?: boolean;
}

const FilterTag: React.FC<FilterProps> = ({
  label,
  isActive = false,
  className = "",
  ...props
}) => {
  const activeClass = isActive
    ? "btn-light text-dark"
    : "btn-outline-light text-white";

  return (
    <button
      className={`btn btn-sm rounded-pill ${activeClass} ${className}`}
      {...props}
    >
      {label}
    </button>
  );
};

export default FilterTag;
