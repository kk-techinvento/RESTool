import React from 'react';

import './filterField.scss';

interface IProps {
  onChange: (filter: string) => void
  // kk-1042
  filterBy: string[]
}

export const FilterField = ({ onChange, filterBy }: IProps) => {
  // kk-1042
  let placeholder = "Search by "+ filterBy.join();
  return (
    <section className="filter-wrapper">
      <h5>Filter:</h5>
      <div className="form-row">
        <input type="text" placeholder={placeholder} onChange={(e) => onChange(e.target.value.toLowerCase())} />
      </div>
    </section>
  );
};