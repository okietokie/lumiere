// src/components/threeD/furniture/FurniturePicker.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Popconfirm, Spin, Empty, Tooltip } from 'antd';
import {
  AppstoreOutlined, DeleteOutlined, ReloadOutlined,
  DragOutlined, SwapOutlined, ExpandOutlined,
} from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';
import ModelPreview from './ModelPreview';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const POLL_MS   = 2500;



// ─────────────────────────────────────────────────────────────────────────────

export default function FurniturePicker({
  selectedItem, placedItems, addItem, deleteItem, gizmoMode, setGizmoMode,
}) {
  const [models,          setModels]         = useState([]);
  const [loading,         setLoading]        = useState(false);
  const [error,           setError]          = useState(null);
  const [activeCategory,  setActiveCategory] = useState('all');
  const [previewModel,    setPreviewModel]   = useState(null);
  const [previewAnchor,   setPreviewAnchor]  = useState(null);
  const hideTimer = useRef(null);

  const fetchModels = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const res  = await fetch(`${API_BASE}/api/models/list`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setModels(data);
      setError(null);
    } catch {
      if (!silent) setError('Could not reach backend. Is it running?');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch immediately on mount
    fetchModels();
    // Poll every 4s so models appearing from Mega download show up automatically
    const t = setInterval(() => fetchModels(true), 4000);
    return () => clearInterval(t);
  }, [fetchModels]);

  // ── Categories: specific ones first, "all" at the end ────────────────────
  const rawCats      = [...new Set(models.map((m) => m.category || 'uncategorized'))];
  const categories   = [...rawCats, 'all'];

  const visibleModels = activeCategory === 'all'
    ? models
    : models.filter((m) => (m.category || 'uncategorized') === activeCategory);

  const gizmoButtons = [
    { mode: 'translate', icon: <DragOutlined />,  label: 'Move'   },
    { mode: 'rotate',    icon: <SwapOutlined />,   label: 'Rotate' },
    { mode: 'scale',     icon: <ExpandOutlined />, label: 'Scale'  },
  ];

  const handleCardHover = (model, el) => {
    clearTimeout(hideTimer.current);
    setPreviewModel(model);
    setPreviewAnchor(el);
  };
  const handleCardLeave = () => {
    hideTimer.current = setTimeout(() => {
      setPreviewModel(null); setPreviewAnchor(null);
    }, 120);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppstoreOutlined style={{ color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Furniture</span>
        </div>
        <Tooltip title="Refresh model list">
          <Button type="text" size="small" icon={<ReloadOutlined />}
            onClick={fetchModels} style={{ color: COLORS.secondary }} />
        </Tooltip>
      </div>

      {/* Category tabs — "all" last */}
      {!loading && models.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
              border:     `1px solid ${activeCategory === cat ? COLORS.action : COLORS.secondary + '60'}`,
              background:  activeCategory === cat ? COLORS.action + '22' : 'transparent',
              color:       activeCategory === cat ? COLORS.action : COLORS.secondary,
              fontSize: 12, textTransform: 'capitalize', transition: 'all 0.2s',
              fontWeight:  cat === 'all' ? 400 : 500,
            }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Model grid */}
      <div style={{ padding: 16, background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60`, minHeight: 120 }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>}
        {error   && <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', padding: 12 }}>{error}</div>}
        {!loading && !error && visibleModels.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: COLORS.secondary, fontSize: 13 }}>No models found</span>} />
        )}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visibleModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onPlace={() => addItem(model)}
                onHover={handleCardHover}
                onLeave={handleCardLeave}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected item controls */}
      {selectedItem && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16,
          background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.action}40` }}>
          <div style={{ color: COLORS.text, fontSize: 13 }}>
            Selected: <strong style={{ color: COLORS.action }}>{selectedItem.name || selectedItem.filename}</strong>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
            {gizmoButtons.map(({ mode, icon, label }) => (
              <Button key={mode} type={gizmoMode === mode ? 'primary' : 'text'}
                onClick={() => setGizmoMode(mode)} block icon={icon} size="small"
                style={{ color: COLORS.text, background: gizmoMode === mode ? COLORS.action : 'transparent' }}>
                {label}
              </Button>
            ))}
          </div>
          <Popconfirm title="Remove this item?" onConfirm={() => deleteItem(selectedItem.id)}>
            <Button danger icon={<DeleteOutlined />} block style={{ background: 'transparent' }}>Remove</Button>
          </Popconfirm>
        </div>
      )}

      {placedItems.length > 0 && (
        <div style={{ color: COLORS.secondary, fontSize: 12, textAlign: 'center' }}>
          {placedItems.length} item{placedItems.length !== 1 ? 's' : ''} placed in room
        </div>
      )}

      {previewModel && previewAnchor && (
        <ModelPreview model={previewModel} anchorEl={previewAnchor}
          onClose={() => { setPreviewModel(null); setPreviewAnchor(null); }} />
      )}
    </div>
  );
}

// ── Model card ────────────────────────────────────────────────────────────────
function ModelCard({ model, onPlace, onHover, onLeave }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseEnter = () => {
    setHovered(true);
    onHover(model, cardRef.current);
  };
  const handleMouseLeave = () => {
    setHovered(false);
    onLeave();
  };

  const handleClick = () => { onPlace(); };

  const categoryIcons = {
    chairs: '🪑', sofas: '🛋️', tables: '🪞',
    beds: '🛏️', cupboards: '🗄️', lamps: '💡', uncategorized: '📦',
  };
  const icon = categoryIcons[model.category] || categoryIcons.uncategorized;

  return (
    <button
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={`Place ${model.name}`}
      style={{
        background:    hovered ? `${COLORS.action}18` : `${COLORS.surface}80`,
        border:        `1px solid ${hovered ? COLORS.action : COLORS.secondary + '50'}`,
        borderRadius:  10,
        padding:       '10px 8px',
        cursor:        'pointer',
        opacity:       1,
        transition:    'all 0.18s',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           5,
        color:         COLORS.text,
        position:      'relative',
        overflow:      'hidden',
      }}
    >


      {/* Icon area */}
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: hovered ? `${COLORS.action}30` : `${COLORS.secondary}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, transition: 'background 0.18s',
      }}>
        {icon}
      </div>

      {/* Name */}
      <span style={{
        fontSize: 11,
        color: hovered ? COLORS.action : COLORS.text,
        textAlign: 'center', lineHeight: 1.3,
        maxWidth: '100%', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%', transition: 'color 0.18s',
      }}>
        {model.name}
      </span>

      {/* Preview hint */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: COLORS.action + 'CC',
          color: '#fff', fontSize: 9, fontWeight: 600,
          padding: '2px 5px', borderRadius: 4,
          letterSpacing: '0.05em',
        }}>
          PREVIEW →
        </div>
      )}


    </button>
  );
}