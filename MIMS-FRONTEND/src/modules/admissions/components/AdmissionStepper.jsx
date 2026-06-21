import React from 'react';
import PropTypes from 'prop-types';
import { MdCheck } from 'react-icons/md';

export default function AdmissionStepper({ steps, current }) {
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full">
      {/* Step track */}
      <div className="relative flex items-start justify-between">
        {/* Background connector line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />

        {/* Filled connector line (progress) */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-[#00843D] z-0 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />

        {steps.map((s, idx) => {
          const active = idx === current;
          const done = idx < current;

          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center flex-1">
              {/* Circle */}
              <div
                className={[
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 shadow-sm',
                  done
                    ? 'bg-[#00843D] border-[#00843D] text-white shadow-green-200 shadow-md'
                    : active
                    ? 'bg-[#00843D] border-[#FFD700] text-white shadow-[#00843D]/40 shadow-lg ring-4 ring-[#FFD700]/30'
                    : 'bg-white border-gray-300 text-gray-400'
                ].join(' ')}
              >
                {done ? (
                  <MdCheck className="text-lg" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={[
                  'mt-2 text-xs font-semibold tracking-wide text-center transition-colors duration-300 hidden sm:block',
                  done
                    ? 'text-[#00843D]'
                    : active
                    ? 'text-[#00843D]'
                    : 'text-gray-400'
                ].join(' ')}
              >
                {s.label}
              </span>

              {/* Mobile: only show step number label for active */}
              {active && (
                <span className="mt-1 text-[10px] font-bold text-[#00843D] sm:hidden">
                  {idx + 1}/{steps.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00843D] to-[#FFD700] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress label */}
      <div className="mt-1 flex justify-between text-[10px] text-gray-400 font-medium">
        <span>Step {current + 1} of {steps.length}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
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
