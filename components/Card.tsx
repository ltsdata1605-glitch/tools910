
import React, { forwardRef } from 'react';

interface CardProps {
  title: React.ReactNode;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  rounded?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ title, actionButton, children, noPadding = false, rounded = true }, ref) => {
  return (
    <div 
      ref={ref} 
      className={`bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/80 overflow-hidden transition-all duration-300 hover:shadow-md group ${
        rounded ? 'rounded-3xl' : 'rounded-none'
      }`}
    >
      <div className={`flex flex-col sm:flex-row justify-between sm:items-center px-6 py-5 gap-4 border-b border-slate-50 dark:border-slate-800/40 card-header-container bg-slate-50/20 dark:bg-slate-900/10 ${!rounded ? 'border-l-4 border-l-primary-600' : ''}`}>
        <div className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
          {title}
        </div>
        {actionButton && (
          <div className="flex-shrink-0 animate-in fade-in duration-300">
            {actionButton}
          </div>
        )}
      </div>
      <div className={`${noPadding ? '' : 'p-6 md:p-8'} relative`}>
        {children}
      </div>
    </div>
  );
});

export default Card;
