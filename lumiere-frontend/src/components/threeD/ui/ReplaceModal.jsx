import { useEffect, useState, useCallback } from 'react';
import { Modal, Spin, Empty } from 'antd';
import { SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';
import { getAccessToken } from '../../../utils/authStorage';
import { apiUrl } from '../../../utils/apiBase';
import { resolveModelPreviewUrls } from '../furniture/FurnitureItem';

export default function ReplaceModal({ open, onClose, selectedItem, onReplace }) {
  const [models,  setModels]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchModels = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = getAccessToken();
      const res  = await fetch(apiUrl('/models/list'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      setModels(await res.json());
    } catch {
      setError('Could not load models.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchModels(); }, [open, fetchModels]);

  const categories   = ['all', ...new Set(models.map((m) => m.category || 'uncategorized'))];
  const visibleModels = activeCategory === 'all'
    ? models
    : models.filter((m) => (m.category || 'uncategorized') === activeCategory);

  const handleReplace = (model) => {
    if (!selectedItem) return;
    // Pass the new model meta but preserve exact transform of the old item
    onReplace({
      filename: model.filename,
      name:     model.name,
      url:      model.url || null,
      category: model.category || null,
      position: selectedItem.position,
      rotation: selectedItem.rotation,
      scale:    selectedItem.scale,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.text }}>
          <SwapOutlined style={{ color: COLORS.action }} />
          Replace Furniture
        </div>
      }
      styles={{
        content: { background: COLORS.surface, border: `1px solid ${COLORS.secondary}40` },
        header:  { background: COLORS.surface, borderBottom: `1px solid ${COLORS.secondary}30` },
        mask:    { backdropFilter: 'blur(4px)' },
      }}
      width={520}
    >
      {/* Current item info */}
      {selectedItem && (
        <div style={{
          padding:      '8px 12px',
          marginBottom: 16,
          background:   `${COLORS.background}CC`,
          borderRadius: 8,
          border:       `1px solid ${COLORS.secondary}40`,
          fontSize:     12,
          color:        COLORS.secondary,
        }}>
          Replacing: <span style={{ color: COLORS.action, fontWeight: 600 }}>{selectedItem.name}</span>
          — size and position will be preserved
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding:      '4px 12px',
              borderRadius: 20,
              border:       `1px solid ${activeCategory === cat ? COLORS.action : COLORS.secondary + '50'}`,
              background:   activeCategory === cat ? COLORS.action + '22' : 'transparent',
              color:        activeCategory === cat ? COLORS.action : COLORS.secondary,
              fontSize:     11,
              cursor:       'pointer',
              fontFamily:   'Inter, sans-serif',
              textTransform:'capitalize',
              transition:   'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Model grid */}
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin />
          </div>
        )}
        {error && (
          <div style={{ color: '#ff6b6b', textAlign: 'center', padding: 16, fontSize: 13 }}>{error}</div>
        )}
        {!loading && !error && visibleModels.length === 0 && (
          <Empty description={<span style={{ color: COLORS.secondary }}>No models found</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {visibleModels.map((model) => (
              <ModelChip
                key={model.id}
                model={model}
                isCurrent={model.filename === selectedItem?.filename}
                onClick={() => handleReplace(model)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ModelChip({ model, isCurrent, onClick }) {
  const categoryIcons = {
    chairs: '🪑', sofas: '🛋️', tables: '🪞', beds: '🛏️',
    cupboards: '🗄️', lamps: '💡', uncategorized: '📦',
  };
  const icon = categoryIcons[model.category] || categoryIcons.uncategorized;
  const previewSrc = resolveModelPreviewUrls(model.url, model.filename, model.preview_url)[0];

  return (
    <button
      onClick={onClick}
      disabled={isCurrent}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            6,
        padding:        '10px 6px',
        borderRadius:   10,
        border:         `1px solid ${isCurrent ? COLORS.action : COLORS.secondary + '40'}`,
        background:     isCurrent ? `${COLORS.action}18` : `${COLORS.background}CC`,
        cursor:         isCurrent ? 'default' : 'pointer',
        opacity:        isCurrent ? 0.5 : 1,
        transition:     'all 0.15s',
        color:          COLORS.text,
        fontFamily:     'Inter, sans-serif',
      }}
      onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = COLORS.action; }}
      onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = COLORS.secondary + '40'; }}
    >
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={model.name}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, display: 'block' }}
        />
      ) : (
        <span style={{ fontSize: 22 }}>{icon}</span>
      )}
      <span style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {model.name}
      </span>
      {isCurrent && <span style={{ fontSize: 9, color: COLORS.action }}>current</span>}
    </button>
  );
}

