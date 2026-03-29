import React from 'react';
import PropTypes from 'prop-types';

export default function AdmissionStepper({ steps, current }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((s, idx) => {
        const active = idx === current;
        const done = idx < current;
        return (
          <div
            key={s.key}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-semibold',
              active ? 'border-malawiRed bg-malawiGold text-malawiBlack' : done ? 'border-malawiGreen bg-green-50 text-green-900' : 'border-gray-200 bg-gray-50 text-gray-700'
            ].join(' ')}
          >
            <span className="w-6 h-6 rounded-full flex items-center justify-center bg-white border">
              {idx + 1}
            </span>
            <span>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

AdmissionStepper.propTypes = {
  current: PropTypes.number.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired
};

