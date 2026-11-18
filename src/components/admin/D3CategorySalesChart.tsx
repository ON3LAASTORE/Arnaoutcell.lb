import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CategorySalesMetric } from '../../utils/adminStatisticsHelpers';

interface D3CategorySalesChartProps {
  categories: CategorySalesMetric[];
  isAr: boolean;
}

export const D3CategorySalesChart: React.FC<D3CategorySalesChartProps> = ({
  categories,
  isAr,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(440);
  const [hoveredCat, setHoveredCat] = useState<CategorySalesMetric | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setContainerWidth(next);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    if (categories.length === 0) return;

    const width = Math.max(260, containerWidth);
    const rowHeight = 42;
    const margin = {
      top: 8,
      right: 78,
      bottom: 12,
      left: width < 380 ? 96 : 122,
    };
    const innerWidth = Math.max(80, width - margin.left - margin.right);
    const innerHeight = categories.length * rowHeight;
    const height = innerHeight + margin.top + margin.bottom;

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const yScale = d3
      .scaleBand<string>()
      .domain(categories.map((c) => c.categoryLabel))
      .range([0, innerHeight])
      .padding(0.32);

    const maxRev = d3.max(categories, (c) => c.revenueUsd) || 100;
    const xScale = d3.scaleLinear().domain([0, maxRev * 1.1]).range([0, innerWidth]);

    // Subtle track backgrounds
    g.selectAll('rect.cat-track')
      .data(categories)
      .enter()
      .append('rect')
      .attr('class', 'cat-track')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.categoryLabel) ?? 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', '#F1F5F9');

    // Data bars
    g.selectAll('rect.cat-bar')
      .data(categories)
      .enter()
      .append('rect')
      .attr('class', 'cat-bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.categoryLabel) ?? 0)
      .attr('width', (d) => Math.max(4, xScale(d.revenueUsd)))
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', '#007AFF')
      .style('cursor', 'pointer')
      .on('mouseenter', (_e, d) => {
        setHoveredCat(d);
        g.selectAll<SVGRectElement, CategorySalesMetric>('rect.cat-bar').attr('fill', (c) =>
          c.categoryLabel === d.categoryLabel ? '#0056B3' : '#93C5FD'
        );
      })
      .on('mouseleave', () => {
        setHoveredCat(null);
        g.selectAll<SVGRectElement, CategorySalesMetric>('rect.cat-bar').attr('fill', '#007AFF');
      });

    // Left category labels
    g.selectAll('text.cat-name')
      .data(categories)
      .enter()
      .append('text')
      .attr('class', 'cat-name')
      .attr('x', -10)
      .attr('y', (d) => (yScale(d.categoryLabel) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#172033')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text((d) =>
        d.categoryLabel.length > 15 ? `${d.categoryLabel.slice(0, 14)}…` : d.categoryLabel
      );

    // Right value labels (tabular monospace)
    g.selectAll('text.cat-val')
      .data(categories)
      .enter()
      .append('text')
      .attr('class', 'cat-val')
      .attr('x', innerWidth + 8)
      .attr('y', (d) => (yScale(d.categoryLabel) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('fill', '#0F172A')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => `$${Math.round(d.revenueUsd).toLocaleString()}`);
  }, [categories, containerWidth]);

  return (
    <div ref={containerRef} className="w-full space-y-2 select-none">
      <svg
        ref={svgRef}
        data-testid="d3-category-sales-svg"
        role="img"
        aria-label={
          isAr ? 'مبيعات الفئات باستخدام D3.js' : 'Product category sales breakdown D3 bar chart'
        }
        className="w-full h-auto block"
      />
      <div className="min-h-[20px] text-[11px] text-[#64748B] flex items-center justify-between pt-1">
        {hoveredCat ? (
          <span>
            <strong className="text-[#172033]">{hoveredCat.categoryLabel}</strong>:{' '}
            <span className="font-mono tabular-nums text-[#007AFF] font-semibold">
              ${hoveredCat.revenueUsd.toLocaleString()}
            </span>{' '}
            ({hoveredCat.unitsSold} {isAr ? 'وحدة' : 'units'})
          </span>
        ) : (
          <span>
            {isAr
              ? 'مرر المؤشر على أي شريط لعرض تفاصيل الوحدات المباعة'
              : 'Hover any category bar to inspect unit volume'}
          </span>
        )}
      </div>
    </div>
  );
};
