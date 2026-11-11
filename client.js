window.__ModuleLoader__.load({
  id: '@local/token-rate-toast',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;

    /* ---------------------------------------------------------------- geometry */

    const PILL_W = 136;
    const PILL_H = 28;
    const CARD_W = 264;
    const CARD_H = 236;
    const OPEN_MS = 340;
    const CLOSE_MS = 220;

    /* ---------------------------------------------------------------- styles */

    const CSS = `
/* The anchor only reserves the pill's place in the header row. */
.trt-anchor { display: inline-flex; flex: none; width: ${PILL_W}px; height: ${PILL_H}px; }

/* ONE element is both the pill and the expanded card. It is portaled to the
   document body (so the header's clipping and stacking never cut it off) and
   is positioned exactly over the anchor while closed. Opening and closing
   animate its own width/height, so nothing is ever created on top of it. */
.trt-card {
  position: fixed;
  z-index: 2147483000;
  width: ${PILL_W}px;
  height: ${PILL_H}px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
  background: var(--dsw-specific-menu, rgba(22,23,28,.92));
  color: var(--dsw-alias-label-primary, #f2f4f8);
  box-shadow: var(--dsw-shadow-lv3, 0 10px 30px rgba(0,0,0,.38));
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  font-size: 13px;
  line-height: 1;
  user-select: none;
  overflow: hidden;
  cursor: pointer;
  transform-origin: 0% 0%;
  transition:
    width ${OPEN_MS}ms cubic-bezier(.2,.8,.25,1),
    height ${OPEN_MS}ms cubic-bezier(.2,.8,.25,1),
    box-shadow ${OPEN_MS}ms ease;
}
.trt-card.trt-open {
  width: ${CARD_W}px;
  height: ${CARD_H}px;
  box-shadow: var(--dsw-shadow-lv3, 0 18px 48px rgba(0,0,0,.48));
  transition:
    width ${OPEN_MS}ms cubic-bezier(.2,.8,.25,1),
    height ${OPEN_MS}ms cubic-bezier(.2,.8,.25,1),
    box-shadow ${OPEN_MS}ms ease;
}
.trt-card.trt-closing {
  transition:
    width ${CLOSE_MS}ms cubic-bezier(.4,0,.6,1),
    height ${CLOSE_MS}ms cubic-bezier(.4,0,.6,1),
    box-shadow ${CLOSE_MS}ms ease;
}

.trt-head { display: flex; align-items: center; gap: 8px; height: ${PILL_H}px; padding: 0 10px; white-space: nowrap; }
.trt-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.trt-dot.trt-live { background: #4a9eff; box-shadow: 0 0 0 0 rgba(74,158,255,.55); animation: trt-pulse 1.3s infinite; }
.trt-dot.trt-idle { background: var(--dsw-alias-label-tertiary, #5c6370); opacity: 0.7; }
@keyframes trt-pulse {
  0% { box-shadow: 0 0 0 0 rgba(74,158,255,.55); }
  70% { box-shadow: 0 0 0 7px rgba(74,158,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(74,158,255,0); }
}
.trt-rate { font-weight: 650; font-variant-numeric: tabular-nums; font-size: 13.5px; letter-spacing: -.2px; }
.trt-unit { color: var(--dsw-alias-label-caption, #98a2b3); font-weight: 400; font-size: 11px; }
.trt-badge { margin-left: 2px; padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 600; background: rgba(74,158,255,.16); color: #7cb8ff; border: 1px solid rgba(74,158,255,.28); }
.trt-chev { flex: none; margin-left: auto; color: var(--dsw-alias-label-caption, #98a2b3); transition: transform .3s cubic-bezier(.2,.8,.25,1); }
.trt-card.trt-open .trt-chev { transform: rotate(180deg); }

/* The body is revealed only while opening/open; it never leaks into the
   collapsed pill. */
.trt-body {
  padding: 4px 12px 12px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity .12s ease, transform .12s ease;
}
.trt-card.trt-open .trt-body {
  opacity: 1;
  transform: translateY(0);
  transition: opacity .2s ease .12s, transform .2s ease .12s;
}

.trt-mainRow { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.trt-mainLabel { font-size: 10px; text-transform: uppercase; letter-spacing: .09em; color: var(--dsw-alias-label-caption, #98a2b3); margin-bottom: 3px; }
.trt-mainRate { font-size: 30px; font-weight: 700; letter-spacing: -1px; font-variant-numeric: tabular-nums; line-height: 1.1; }
.trt-mainRate span { font-size: 12px; font-weight: 400; color: var(--dsw-alias-label-caption, #98a2b3); margin-left: 4px; letter-spacing: 0; }
.trt-spark { display: block; width: 100%; height: 52px; margin-top: 2px; }
.trt-agg { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; margin: 8px 0; border-radius: 9px; background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.10)); font-size: 11px; color: var(--dsw-alias-label-secondary, #c3c9d4); }
.trt-agg b { color: var(--dsw-alias-label-primary, #f2f4f8); font-size: 13px; font-variant-numeric: tabular-nums; }
.trt-subs { display: flex; flex-direction: column; gap: 5px; margin-top: 2px; max-height: 150px; overflow: auto; }
.trt-sub { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--dsw-alias-label-secondary, #c3c9d4); }
.trt-subDot { width: 5px; height: 5px; border-radius: 50%; background: #3f4552; flex: none; }
.trt-subDot.trt-live { background: #41ba41; animation: trt-pulse 1.6s infinite; }
.trt-subName { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.trt-subRate { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--dsw-alias-label-primary, #f2f4f8); }
.trt-subUnit { color: var(--dsw-alias-label-caption, #98a2b3); font-weight: 400; margin-left: 2px; }
.trt-empty { font-size: 11px; color: var(--dsw-alias-label-caption, #98a2b3); padding: 2px 0; }
`;

    function injectStyles() {
      if (typeof document === 'undefined' || document.head === null) return;
      // A plugin reinstall leaves the previous generation's tag in the DOM;
      // drop every stale tag so the current sheet always wins.
      for (const stale of document.querySelectorAll('style[data-plugin-css^="token-rate-toast"]')) {
        stale.remove();
      }
      const tag = document.createElement('style');
      tag.dataset.pluginCss = 'token-rate-toast';
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    const HISTORY_LIMIT = 40;

    function Sparkline(props) {
      const data = props.data;
      const width = 232; const height = 52;
      const svgStyle = { display: 'block', width: '100%', height: height };
      if (!data || data.length < 2) {
        return h('svg', { className: 'trt-spark', style: svgStyle, viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: 'none' },
          h('line', { x1: 0, y1: height - 1, x2: width, y2: height - 1, stroke: 'rgba(127,127,127,.25)', strokeWidth: 1 }));
      }
      const max = Math.max(1, ...data);
      const step = width / (data.length - 1);
      const points = data.map((value, index) => [index * step, height - (value / max) * (height - 6) - 3]);
      const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const area = line + ' L' + width + ',' + height + ' L0,' + height + ' Z';
      return h('svg', { className: 'trt-spark', style: svgStyle, viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: 'none' },
        h('defs', null, h('linearGradient', { id: 'trt-grad', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: 'rgba(74,158,255,.45)' }),
          h('stop', { offset: '100%', stopColor: 'rgba(74,158,255,0)' }))),
        h('path', { d: area, fill: 'url(#trt-grad)' }),
        h('path', { d: line, fill: 'none', stroke: '#4a9eff', strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' }));
    }

    function TokenRateChip(props) {
      injectStyles();
      const sessionId = props && (props.sessionId || (props.session && props.session.id) || props.rootSessionId);

      const [data, setData] = React.useState(null);
      // `open` is the visual state (drives the CSS transition);
      // `expanded` keeps the body mounted through the closing transition.
      const [open, setOpen] = React.useState(false);
      const [expanded, setExpanded] = React.useState(false);
      const [pos, setPos] = React.useState(null);

      const anchorRef = React.useRef(null);
      const historyRef = React.useRef([]);
      const closeTimerRef = React.useRef(null);
      const [, forceTick] = React.useState(0);

      // Poll the on-screen session's rate.
      React.useEffect(() => {
        let alive = true;
        const targetParam = sessionId ? '?session=' + encodeURIComponent(sessionId) : '';
        const poll = async () => {
          try {
            const res = await fetch('/token-rate/data' + targetParam, { cache: 'no-store' });
            if (!res.ok) return;
            const next = await res.json();
            if (!alive) return;
            setData(next);

            const isStreaming = next && next.main && next.main.streaming;
            const currentRate = next && next.main ? (isStreaming ? next.main.rate : 0) : 0;
            const hist = historyRef.current;
            hist.push(currentRate);
            if (hist.length > HISTORY_LIMIT) hist.shift();
            forceTick((v) => v + 1);
          } catch (e) { /* ignore */ }
        };
        poll();
        const timer = setInterval(poll, 350);
        return () => { alive = false; clearInterval(timer); };
      }, [sessionId]);

      const measure = React.useCallback(() => {
        const el = anchorRef.current;
        if (el === null) return;
        const rect = el.getBoundingClientRect();
        setPos({ top: rect.top, left: rect.left });
      }, []);

      // Track the anchor's screen position for the whole lifetime, so the
      // portaled chip sits exactly over its reserved place.
      React.useEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        document.addEventListener('scroll', measure, true);
        const frame = requestAnimationFrame(measure);
        return () => {
          cancelAnimationFrame(frame);
          window.removeEventListener('resize', measure);
          document.removeEventListener('scroll', measure, true);
        };
      }, [measure]);

      React.useEffect(() => () => {
        if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
      }, []);

      const expand = () => {
        if (closeTimerRef.current !== null) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        measure();
        setExpanded(true);
        setOpen(true);
      };

      const collapse = () => {
        if (!open) return;
        setOpen(false);
        if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null;
          setExpanded(false);
        }, CLOSE_MS);
      };

      const toggle = (e) => {
        if (e) e.stopPropagation();
        if (open) collapse();
        else expand();
      };

      // Dismiss on outside click / Escape.
      React.useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest('.trt-card')) return;
          collapse();
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') collapse();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);

      const main = (data && data.main) || { rate: 0, lastRate: 0, outputTokens: 0, streaming: false };
      const subagents = (data && Array.isArray(data.subagents)) ? data.subagents : [];
      const liveSubs = subagents.filter((s) => s.streaming);
      const isStreaming = Boolean(main.streaming || liveSubs.length > 0);
      const aggregate = (data && typeof data.aggregateRate === 'number') ? data.aggregateRate : main.rate;
      const displayRate = isStreaming ? (main.rate || 0).toFixed(1) : '0.0';

      // The single element: pill when closed, card when open.
      const chip = pos === null ? null : ReactDOM.createPortal(
        h('div', {
          className: 'trt-card' + (open ? ' trt-open' : ''),
          style: { top: pos.top + 'px', left: pos.left + 'px' },
          onClick: toggle,
          role: 'button',
          tabIndex: 0,
          'aria-expanded': open,
          'aria-label': 'Token rate: ' + displayRate + ' tokens per second',
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggle(event);
            }
          },
        },
          h('div', { className: 'trt-head' },
            h('span', { className: 'trt-dot ' + (isStreaming ? 'trt-live' : 'trt-idle') }),
            h('span', { className: 'trt-rate' }, displayRate),
            h('span', { className: 'trt-unit' }, 'tok/s'),
            liveSubs.length > 0 ? h('span', { className: 'trt-badge' }, '+' + liveSubs.length) : null,
            h('svg', {
              className: 'trt-chev',
              width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none',
              stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round',
            }, h('path', { d: 'M6 9l6 6 6-6' }))
          ),
          expanded ? h('div', {
            className: 'trt-body',
            onClick: (event) => event.stopPropagation(),
          },
            h('div', { className: 'trt-mainRow' },
              h('div', null,
                h('div', { className: 'trt-mainLabel' }, 'Main agent'),
                h('div', { className: 'trt-mainRate' }, (main.rate || 0).toFixed(1), h('span', null, 'tok/s'))
              )
            ),
            h(Sparkline, { data: historyRef.current }),
            h('div', { className: 'trt-agg' },
              h('span', null, 'Total (main + subagents)'),
              h('span', null, h('b', null, (aggregate || 0).toFixed(1)), ' tok/s')
            ),
            liveSubs.length === 0
              ? h('div', { className: 'trt-empty' }, subagents.length === 0 ? 'No subagents' : 'No subagents active')
              : h('div', { className: 'trt-subs' },
                  liveSubs.map((sub) => h('div', { className: 'trt-sub', key: sub.sessionId },
                    h('span', { className: 'trt-subDot trt-live' }),
                    h('span', { className: 'trt-subName', title: sub.label }, sub.label),
                    h('span', { className: 'trt-subRate' }, (sub.rate || 0).toFixed(1), h('span', { className: 'trt-subUnit' }, 'tok/s'))
                  ))
                )
          ) : null
        ),
        document.body
      );

      return h(React.Fragment, null,
        h('div', { ref: anchorRef, className: 'trt-anchor' }),
        chip
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.inject(['slots'], (scope) => {
          scope.slots.inject('conversation.session.header.actions', () => scope.slots.register({
            name: 'conversation.session.header.actions',
            id: 'token-rate-header-chip',
            order: 25,
          }, TokenRateChip));
        });
      },
    };
  },
});
