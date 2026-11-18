import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DailySalesTrafficPoint } from '../../utils/adminStatisticsHelpers';

export type SalesMetricMode = 'revenue' | 'units';

interface D3DailySalesTrafficChartProps {
  data: DailySalesTrafficPoint[];
  salesMetric: SalesMetricMode;
  showSalesBars: boolean;
  showTrafficLine: boolean;
  isAr: boolean;
}

export const D3DailySalesTrafficChart: React.FC<D3DailySalesTrafficChartProps> = ({
  data,
  salesMetric,
  showSalesBars,
  showTrafficLine,
  isAr,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(820);
  const [hoveredInfo, setHoveredInfo] = useState<{
    point: DailySalesTrafficPoint;
    x: number;
    y: number;
  } | null>(null);

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

    const width = Math.max(300, containerWidth);
    const height = width < 520 ? 290 : 340;
    const margin = {
      top: 18,
      right: width < 520 ? 42 : 56,
      bottom: 34,
      left: width < 520 ? 48 : 62,
    };
    const innerWidth = Math.max(120, width - margin.left - margin.right);
    const innerHeight = Math.max(120, height - margin.top - margin.bottom);

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    if (data.length === 0) return;

    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-traffic-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#16A34A').attr('stop-opacity', 0.2);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#16A34A').attr('stop-opacity', 0.01);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.dateKey))
      .range([0, innerWidth])
      .padding(data.length > 20 ? 0.34 : 0.28);

    const maxSalesVal =
      d3.max(data, (d) => (salesMetric === 'revenue' ? d.revenueUsd : d.unitsSold)) || 0;
    const ySalesMax = maxSalesVal > 0 ? maxSalesVal * 1.18 : salesMetric === 'revenue' ? 100 : 5;
    const ySales = d3.scaleLinear().domain([0, ySalesMax]).nice().range([innerHeight, 0]);

    const maxVisitsVal = d3.max(data, (d) => d.visits) || 0;
    const yTrafficMax = maxVisitsVal > 0 ? maxVisitsVal * 1.18 : 20;
    const yTraffic = d3.scaleLinear().domain([0, yTrafficMax]).nice().range([innerHeight, 0]);

    // Subtle horizontal gridlines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3
          .axisLeft(ySales)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .call((grid) => {
        grid.select('.domain').remove();
        grid
          .selectAll('line')
          .attr('stroke', '#E2E8F0')
          .attr('stroke-dasharray', '3,3');
      });

    // X-Axis with automatic label thinning and minimum spacing before the final tick
    const maxLabels = width < 520 ? 5 : data.length > 16 ? 8 : 14;
    const step = Math.max(1, Math.ceil(data.length / maxLabels));
    const minTailGap = step > 1 ? Math.max(2, Math.ceil(step / 2)) : 1;
    const visibleTickKeys = data
      .filter((_, idx) => {
        if (idx === data.length - 1) return true;
        if (data.length - 1 - idx < minTailGap) return false;
        return idx % step === 0;
      })
      .map((d) => d.dateKey);

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(visibleTickKeys)
      .tickFormat((key) => {
        const match = data.find((d) => d.dateKey === key);
        return match ? (isAr ? match.labelAr : match.labelEn) : key;
      });

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((ax) => {
        ax.select('.domain').attr('stroke', '#CBD5E1');
        ax.selectAll('.tick line').attr('stroke', '#CBD5E1');
        ax.selectAll('text')
          .attr('fill', '#64748B')
          .attr('font-size', '11px')
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
      });

    // Left Y-Axis (Sales)
    const leftAxis = d3
      .axisLeft(ySales)
      .ticks(5)
      .tickFormat((val) => {
        const n = Number(val);
        if (salesMetric === 'revenue') {
          return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
        }
        return `${Math.round(n)}`;
      });

    g.append('g')
      .attr('class', 'y-axis-left')
      .call(leftAxis)
      .call((ax) => {
        ax.select('.domain').remove();
        ax.selectAll('.tick line').remove();
        ax.selectAll('text')
          .attr('fill', salesMetric === 'revenue' ? '#007AFF' : '#4F46E5')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
      });

    // Right Y-Axis (Traffic Visits)
    const rightAxis = d3
      .axisRight(yTraffic)
      .ticks(5)
      .tickFormat((val) => `${Math.round(Number(val))}`);

    g.append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(rightAxis)
      .call((ax) => {
        ax.select('.domain').remove();
        ax.selectAll('.tick line').remove();
        ax.selectAll('text')
          .attr('fill', '#16A34A')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
      });

    // Sales Bars
    const barColor = salesMetric === 'revenue' ? '#007AFF' : '#6366F1';
    const barHoverColor = salesMetric === 'revenue' ? '#0056B3' : '#4338CA';

    if (showSalesBars) {
      g.selectAll('rect.sales-bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'sales-bar')
        .attr('x', (d) => xScale(d.dateKey) ?? 0)
        .attr('y', (d) => ySales(salesMetric === 'revenue' ? d.revenueUsd : d.unitsSold))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) =>
          Math.max(0, innerHeight - ySales(salesMetric === 'revenue' ? d.revenueUsd : d.unitsSold))
        )
        .attr('rx', Math.min(5, xScale.bandwidth() / 3))
        .attr('fill', barColor)
        .attr('fill-opacity', 0.86);
    }

    // Traffic Area + Smooth Curve + Points
    if (showTrafficLine) {
      const areaGen = d3
        .area<DailySalesTrafficPoint>()
        .x((d) => (xScale(d.dateKey) ?? 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1((d) => yTraffic(d.visits))
        .curve(d3.curveMonotoneX);

      const lineGen = d3
        .line<DailySalesTrafficPoint>()
        .x((d) => (xScale(d.dateKey) ?? 0) + xScale.bandwidth() / 2)
        .y((d) => yTraffic(d.visits))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('class', 'traffic-area')
        .attr('fill', 'url(#d3-traffic-area-grad)')
        .attr('d', areaGen);

      g.append('path')
        .datum(data)
        .attr('class', 'traffic-line')
        .attr('fill', 'none')
        .attr('stroke', '#16A34A')
        .attr('stroke-width', 2.5)
        .attr('d', lineGen);

      g.selectAll('circle.traffic-dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'traffic-dot')
        .attr('cx', (d) => (xScale(d.dateKey) ?? 0) + xScale.bandwidth() / 2)
        .attr('cy', (d) => yTraffic(d.visits))
        .attr('r', data.length > 20 ? 3 : 3.8)
        .attr('fill', '#FFFFFF')
        .attr('stroke', '#16A34A')
        .attr('stroke-width', 2);
    }

    // Hover Crosshair Guide Line (updated cleanly on hover)
    const guideLine = g
      .append('line')
      .attr('class', 'hover-guide')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94A3B8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Interactive Column Hit Areas for smooth cursor tracking
    const bandStep = xScale.step();
    const hitGroup = g.append('g').attr('class', 'hover-targets');

    hitGroup
      .selectAll('rect.hover-column')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'hover-column')
      .attr('x', (d) => {
        const bx = xScale(d.dateKey) ?? 0;
        return Math.max(0, bx - (bandStep - xScale.bandwidth()) / 2);
      })
      .attr('y', 0)
      .attr('width', bandStep)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseenter touchstart', (_event, d) => {
        const centerX = (xScale(d.dateKey) ?? 0) + xScale.bandwidth() / 2;
        const anchorY = showTrafficLine
          ? yTraffic(d.visits)
          : ySales(salesMetric === 'revenue' ? d.revenueUsd : d.unitsSold);

        guideLine.attr('x1', centerX).attr('x2', centerX).style('opacity', 1);
        g.selectAll<SVGRectElement, DailySalesTrafficPoint>('rect.sales-bar')
          .attr('fill', (pt) => (pt.dateKey === d.dateKey ? barHoverColor : barColor))
          .attr('fill-opacity', (pt) => (pt.dateKey === d.dateKey ? 1 : 0.72));
        g.selectAll<SVGCircleElement, DailySalesTrafficPoint>('circle.traffic-dot')
          .attr('r', (pt) => (pt.dateKey === d.dateKey ? 6 : data.length > 20 ? 3 : 3.8))
          .attr('fill', (pt) => (pt.dateKey === d.dateKey ? '#16A34A' : '#FFFFFF'));

        setHoveredInfo({
          point: d,
          x: margin.left + centerX,
          y: margin.top + anchorY,
        });
      })
      .on('mouseleave', () => {
        guideLine.style('opacity', 0);
        g.selectAll<SVGRectElement, DailySalesTrafficPoint>('rect.sales-bar')
          .attr('fill', barColor)
          .attr('fill-opacity', 0.86);
        g.selectAll<SVGCircleElement, DailySalesTrafficPoint>('circle.traffic-dot')
          .attr('r', data.length > 20 ? 3 : 3.8)
          .attr('fill', '#FFFFFF');
        setHoveredInfo(null);
      });
  }, [data, containerWidth, salesMetric, showSalesBars, showTrafficLine, isAr]);

  const tooltipLeft = hoveredInfo
    ? Math.min(Math.max(12, hoveredInfo.x + 14), Math.max(12, containerWidth - 216))
    : 0;
  const tooltipTop = hoveredInfo ? Math.max(8, hoveredInfo.y - 24) : 0;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg
        ref={svgRef}
        data-testid="d3-daily-sales-traffic-svg"
        role="img"
        aria-label={
          isAr
            ? 'مخطط المبيعات اليومية وحركة الزيارات باستخدام D3.js'
            : 'Daily product sales and storefront traffic D3 chart'
        }
        className="w-full h-auto overflow-visible block"
      />

      {hoveredInfo && (
        <div
          data-testid="d3-chart-tooltip"
          className="pointer-events-none absolute z-20 w-52 rounded-xl bg-[#172033] text-white p-3 shadow-lg border border-slate-700/80 text-xs space-y-1.5"
          style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }}
        >
          <div className="font-bold text-slate-100 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>{isAr ? hoveredInfo.point.labelAr : hoveredInfo.point.labelEn}</span>
            <span className="font-mono text-[10px] text-slate-400">
              {hoveredInfo.point.dateKey}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'الإيرادات:' : 'Revenue:'}</span>
            <span className="font-mono tabular-nums font-bold text-[#60A5FA]">
              ${hoveredInfo.point.revenueUsd.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'القطع المباعة:' : 'Units Sold:'}</span>
            <span className="font-mono tabular-nums font-semibold">
              {hoveredInfo.point.unitsSold} ({hoveredInfo.point.ordersCount}{' '}
              {isAr ? 'طلب' : 'orders'})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'الزيارات:' : 'Visits:'}</span>
            <span className="font-mono tabular-nums font-bold text-[#4ADE80]">
              {hoveredInfo.point.visits.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{isAr ? 'مشاهدات المنتج:' : 'Product Views:'}</span>
            <span className="font-mono tabular-nums">
              {hoveredInfo.point.productViews.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-700/80">
            <span className="text-slate-300">{isAr ? 'معدل التحويل:' : 'Conversion:'}</span>
            <span className="font-mono tabular-nums font-semibold text-amber-300">
              {hoveredInfo.point.conversionRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
