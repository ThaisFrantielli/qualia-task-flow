import React from 'react';
import { Card } from '@/components/ui/card';

interface CardItem {
  key: string;
  title: string;
  value: number | string;
  icon: React.ReactNode;
  delta?: string;
  accent?: string;
}

const CardBlock: React.FC<{ items: CardItem[] }> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {items.map(it => {
        const isNegative = it.delta?.startsWith("-");
        return (
          <Card
            key={it.key}
            className="
              rounded-2xl 
              p-5 
              bg-white shadow-sm 
              hover:shadow-md 
              transition-all 
              duration-300 
              border border-gray-100
            "
          >
            {/* Top Right Delta */}
            {it.delta && (
              <div
                className={`
                  absolute right-4 top-4 
                  text-xs font-semibold px-2 py-0.5 rounded-full
                  ${isNegative
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"}
                `}
              >
                {it.delta}
              </div>
            )}

            {/* Content */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">{it.title}</span>
                <span className="text-3xl font-bold mt-1 text-gray-900">{it.value}</span>
              </div>

              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-inner"
                style={{
                  background: `${it.accent}`,
                }}
              >
                <div className="text-white">{it.icon}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CardBlock;
