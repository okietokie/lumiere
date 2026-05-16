import { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty, Input, Spin } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import WeekendRoundedIcon from '@mui/icons-material/WeekendRounded';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import KingBedRoundedIcon from '@mui/icons-material/KingBedRounded';
import ChairRoundedIcon from '@mui/icons-material/ChairRounded';
import LightRoundedIcon from '@mui/icons-material/LightRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { COLORS } from '../../../utils/colors';
import { resolveModelPreviewUrls } from './FurnitureItem';
import { CardPreview } from './FurnitureModelCard';
import { fetchModelManifest } from '../../../hooks/useModelPrefetch';

const categoryConfig = {
  sofa: { label: 'Sofa', Icon: WeekendRoundedIcon },
  table: { label: 'Table', Icon: TableRestaurantRoundedIcon },
  bed: { label: 'Bed', Icon: KingBedRoundedIcon },
  chair: { label: 'Chair', Icon: ChairRoundedIcon },
  lamp: { label: 'Lamp', Icon: LightRoundedIcon },
  cupboard: { label: 'Cupboard', Icon: Inventory2RoundedIcon },
  others: { label: 'Others', Icon: CategoryRoundedIcon },
};

function normalizeCategoryKey(category) {
  const value = String(category ?? '').trim().toLowerCase();
  if (!value) return 'others';
  if (value.includes('sofa') || value.includes('couch') || value.includes('sectional')) return 'sofa';
  if (value.includes('table') || value.includes('desk')) return 'table';
  if (value.includes('bed') || value.includes('nightstand')) return 'bed';
  if (value.includes('chair') || value.includes('stool') || value.includes('bench')) return 'chair';
  if (value.includes('lamp') || value.includes('light')) return 'lamp';
  if (value.includes('cupboard') || value.includes('cabinet') || value.includes('wardrobe') || value.includes('dresser')) return 'cupboard';
  return 'others';
}

function ModelPreviewSurface({
  model,
  alt,
  height = '100%',
  borderRadius = 12,
  allow3D = true,
  force3D = false,
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [use3DPreview, setUse3DPreview] = useState(force3D);
  const candidates = useMemo(
    () => resolveModelPreviewUrls(model?.url, model?.filename, model?.preview_url),
    [model?.filename, model?.preview_url, model?.url]
  );

  useEffect(() => {
    setCandidateIndex(0);
    setUse3DPreview(force3D);
  }, [force3D, model?.filename, model?.preview_url, model?.url]);

  const activeSrc = candidates[candidateIndex] ?? null;
  const canShow3D = allow3D && Boolean(model?.url && model?.filename);

  if (use3DPreview && canShow3D) {
    return (
      <div style={{ width: '100%', height, borderRadius, overflow: 'hidden' }}>
        <CardPreview url={model.url} filename={model.filename} />
      </div>
    );
  }

  if (!activeSrc) {
    if (canShow3D) {
      return (
        <div style={{ width: '100%', height, borderRadius, overflow: 'hidden' }}>
          <CardPreview url={model.url} filename={model.filename} />
        </div>
      );
    }
    return (
      <div style={{
        width: '100%',
        height,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(240, 225, 210, 0.7)',
        fontSize: 12,
      }}>
        Preview
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex((current) => current + 1);
        } else if (canShow3D) {
          setUse3DPreview(true);
        }
      }}
      style={{
        width: '100%',
        height,
        objectFit: 'cover',
        display: 'block',
        borderRadius,
      }}
    />
  );
}

function formatFileSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return 'Preview available';
  if (sizeBytes < 1_000_000) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1_000_000).toFixed(1)} MB`;
}

function compactCardStyle(active = false) {
  return {
    width: '100%',
    borderRadius: 18,
    border: `1px solid ${active ? COLORS.action : 'rgba(196, 154, 108, 0.24)'}`,
    background: active
      ? 'linear-gradient(135deg, rgba(112, 72, 36, 0.58) 0%, rgba(49, 37, 29, 0.95) 100%)'
      : 'linear-gradient(180deg, rgba(36, 30, 27, 0.94) 0%, rgba(24, 20, 18, 0.98) 100%)',
    boxShadow: active
      ? '0 0 0 1px rgba(237, 180, 103, 0.18), 0 16px 34px rgba(0, 0, 0, 0.2), inset 0 0 34px rgba(214, 146, 71, 0.13)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
  };
}

function SidebarHeader({ eyebrow, title, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: '1px solid rgba(232, 176, 92, 0.35)',
              background: 'linear-gradient(180deg, rgba(62, 45, 31, 0.92) 0%, rgba(36, 28, 24, 0.98) 100%)',
              color: '#f0c07f',
              boxShadow: '0 0 0 1px rgba(235, 173, 88, 0.08), 0 10px 24px rgba(0, 0, 0, 0.18), inset 0 0 24px rgba(214, 146, 71, 0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <LeftOutlined />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        </div>
      </div>
      <div style={{ color: '#f2e8de', fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>
        {title}
      </div>
    </div>
  );
}

function CategoryRow({ category, active, onClick }) {
  const { label, Icon } = categoryConfig[category.key] ?? categoryConfig.others;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...compactCardStyle(active),
        minHeight: 50,
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        color: active ? '#f5eadf' : '#e7d8ca',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: COLORS.action }}>
        <Icon style={{ fontSize: 18 }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{label}</span>
      </span>
      <RightOutlined style={{ color: active ? '#f0b35b' : 'rgba(231, 214, 196, 0.74)', fontSize: 12 }} />
    </button>
  );
}

function FurnitureTile({ model, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...compactCardStyle(active),
        padding: 7,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: 'pointer',
        textAlign: 'left',
        color: '#f2e8de',
      }}
    >
      <div style={{
        height: 72,
        borderRadius: 10,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(61, 50, 44, 0.95) 0%, rgba(22, 18, 16, 0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <ModelPreviewSurface
          model={model}
          alt={model.name}
          borderRadius={10}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {model.name}
          </div>
          <div style={{ color: 'rgba(237, 224, 211, 0.68)', fontSize: 9, marginTop: 2 }}>
            {formatFileSize(model.size_bytes)}
          </div>
        </div>
        <span style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          border: '1px solid rgba(226, 167, 88, 0.24)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.action,
          flexShrink: 0,
        }}>
          <RightOutlined style={{ fontSize: 10 }} />
        </span>
      </div>
    </button>
  );
}

function RoomChoiceButton({ room, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 42,
        padding: '10px 14px',
        borderRadius: 14,
        border: `1px solid ${active ? COLORS.action : 'rgba(196, 154, 108, 0.2)'}`,
        background: active
          ? 'linear-gradient(135deg, rgba(117, 76, 38, 0.82) 0%, rgba(63, 45, 31, 0.94) 100%)'
          : 'rgba(37, 30, 27, 0.92)',
        color: active ? '#fff7ef' : '#eadbcb',
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {room.name}
    </button>
  );
}

export default function FurnishPanel({
  rooms = [],
  selectedRoomId = null,
  onBeginPlacement,
  pendingPlacement = null,
}) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState('furniture');
  const [selectedCategory, setSelectedCategory] = useState('sofa');
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [detailPreviewMode, setDetailPreviewMode] = useState('catalog');

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModelManifest();
      setModels(data);
    } catch {
      setError('Could not load furniture right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const groupedModels = useMemo(() => {
    const groups = new Map();
    models.forEach((model) => {
      const key = normalizeCategoryKey(model.category);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(model);
    });
    return groups;
  }, [models]);

  const categoryEntries = useMemo(() => (
    Object.keys(categoryConfig)
      .map((key) => ({ key, models: groupedModels.get(key) ?? [] }))
      .filter((entry) => entry.models.length > 0)
  ), [groupedModels]);

  useEffect(() => {
    if (!categoryEntries.length) return;
    if (!categoryEntries.some((entry) => entry.key === selectedCategory)) {
      setSelectedCategory(categoryEntries[0].key);
    }
  }, [categoryEntries, selectedCategory]);

  const normalizedQuery = searchValue.trim().toLowerCase();
  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) return categoryEntries;
    return categoryEntries.filter((entry) => {
      const label = (categoryConfig[entry.key] ?? categoryConfig.others).label.toLowerCase();
      return label.includes(normalizedQuery) || entry.models.some((model) => model.name?.toLowerCase().includes(normalizedQuery));
    });
  }, [categoryEntries, normalizedQuery]);

  const categoryModels = useMemo(() => {
    const modelsForCategory = groupedModels.get(selectedCategory) ?? [];
    if (!normalizedQuery) return modelsForCategory;
    return modelsForCategory.filter((model) => model.name?.toLowerCase().includes(normalizedQuery));
  }, [groupedModels, normalizedQuery, selectedCategory]);

  const selectedModel = useMemo(
    () => categoryModels.find((model) => model.id === selectedModelId || model.filename === selectedModelId)
      ?? (groupedModels.get(selectedCategory) ?? []).find((model) => model.id === selectedModelId || model.filename === selectedModelId)
      ?? null,
    [categoryModels, groupedModels, selectedCategory, selectedModelId]
  );

  const pendingRoomName = rooms.find((room) => room.id === pendingPlacement?.roomId)?.name ?? null;

  useEffect(() => {
    if (!selectedModel && page === 'detail' && categoryModels[0]) {
      setSelectedModelId(categoryModels[0].id ?? categoryModels[0].filename);
    }
  }, [categoryModels, page, selectedModel]);

  const openCategory = useCallback((categoryKey) => {
    setSelectedCategory(categoryKey);
    setSearchValue('');
    setRoomPickerOpen(false);
    setPage('category');
  }, []);

  const openModel = useCallback((model) => {
    setSelectedModelId(model.id ?? model.filename);
    setRoomPickerOpen(false);
    setDetailPreviewMode('catalog');
    setPage('detail');
  }, []);

  const handleBeginPlacement = useCallback((room) => {
    if (!selectedModel || !onBeginPlacement) return;
    onBeginPlacement(selectedModel, room.id);
    setRoomPickerOpen(false);
  }, [onBeginPlacement, selectedModel]);

  const categoryListContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SidebarHeader eyebrow="Furnish" title="Furniture" />
      <Input
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Search furniture..."
        prefix={<SearchOutlined style={{ color: 'rgba(233, 214, 196, 0.55)' }} />}
        style={{
          height: 36,
          borderRadius: 12,
          border: '1px solid rgba(196, 154, 108, 0.2)',
          background: 'rgba(24, 20, 18, 0.92)',
          color: '#f2e8de',
        }}
      />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
          <Spin size="small" />
        </div>
      ) : error ? (
        <div style={{
          ...compactCardStyle(false),
          padding: '14px 16px',
          color: '#ffbeae',
          fontSize: 13,
        }}>
          {error}
        </div>
      ) : visibleCategories.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {visibleCategories.map((entry) => (
            <CategoryRow
              key={entry.key}
              category={entry}
              active={selectedCategory === entry.key}
              onClick={() => openCategory(entry.key)}
            />
          ))}
        </div>
      ) : (
        <div style={{ ...compactCardStyle(false), padding: '10px 0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'rgba(240, 224, 208, 0.68)' }}>No furniture found</span>}
          />
        </div>
      )}
    </div>
  );

  const categoryTitle = (categoryConfig[selectedCategory] ?? categoryConfig.others).label;

  const modelGridContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SidebarHeader eyebrow={categoryTitle} title={categoryTitle} onBack={() => setPage('furniture')} />
      <Input
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder={`Search ${categoryTitle.toLowerCase()}...`}
        prefix={<SearchOutlined style={{ color: 'rgba(233, 214, 196, 0.55)' }} />}
        style={{
          height: 36,
          borderRadius: 12,
          border: '1px solid rgba(196, 154, 108, 0.2)',
          background: 'rgba(24, 20, 18, 0.92)',
          color: '#f2e8de',
        }}
      />
      {categoryModels.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {categoryModels.map((model) => (
            <FurnitureTile
              key={model.id ?? model.filename}
              model={model}
              active={(model.id ?? model.filename) === selectedModelId}
              onClick={() => openModel(model)}
            />
          ))}
        </div>
      ) : (
        <div style={{ ...compactCardStyle(false), padding: '10px 0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'rgba(240, 224, 208, 0.68)' }}>No items in this category</span>}
          />
        </div>
      )}
    </div>
  );

  const canShow3DPreview = Boolean(selectedModel?.url && selectedModel?.filename);

  const detailContent = selectedModel && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SidebarHeader eyebrow={categoryTitle} title={selectedModel.name} onBack={() => setPage('category')} />
      <div style={{
        ...compactCardStyle(false),
        padding: 9,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div style={{
          height: 150,
          borderRadius: 12,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(70, 57, 49, 0.96) 0%, rgba(20, 17, 15, 0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.04)',
          position: 'relative',
        }}>
          <ModelPreviewSurface
            model={selectedModel}
            alt={selectedModel.name}
            borderRadius={12}
            force3D={detailPreviewMode === '3d'}
          />
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {canShow3DPreview && (
              <button
                type="button"
                onClick={() => setDetailPreviewMode((current) => (current === '3d' ? 'catalog' : '3d'))}
                style={{
                  minHeight: 24,
                  padding: '0 9px',
                  borderRadius: 999,
                  border: `1px solid ${detailPreviewMode === '3d' ? 'rgba(237, 177, 92, 0.52)' : 'rgba(196, 154, 108, 0.22)'}`,
                  background: detailPreviewMode === '3d' ? 'rgba(118, 78, 40, 0.92)' : 'rgba(22, 18, 16, 0.78)',
                  color: '#f0dcc6',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {detailPreviewMode === '3d' ? 'Catalog' : '3D'}
              </button>
            )}
            <div style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(22, 18, 16, 0.78)',
              border: '1px solid rgba(196, 154, 108, 0.22)',
              color: '#f0dcc6',
              fontSize: 10,
              fontWeight: 700,
            }}>
              {detailPreviewMode === '3d' ? '3D Preview' : 'Catalog Preview'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#f1e6dc', fontSize: 12, fontWeight: 700 }}>Size</span>
            <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 700 }}>{formatFileSize(selectedModel.size_bytes)}</span>
          </div>

          <button
            type="button"
            onClick={() => setRoomPickerOpen((open) => !open)}
            style={{
              width: '100%',
              minHeight: 42,
              borderRadius: 14,
              border: '1px solid rgba(214, 164, 93, 0.4)',
              background: 'linear-gradient(135deg, rgba(191, 139, 75, 0.92) 0%, rgba(123, 81, 43, 0.98) 100%)',
              color: '#fff7ef',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Place in Scene
          </button>
        </div>
      </div>

      {roomPickerOpen && (
        <div style={{
          ...compactCardStyle(false),
          padding: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}>
          <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Choose Room
          </div>
          {rooms.length ? rooms.map((room) => (
            <RoomChoiceButton
              key={room.id}
              room={room}
              active={selectedRoomId === room.id}
              onClick={() => handleBeginPlacement(room)}
            />
          )) : (
            <div style={{ color: 'rgba(240, 224, 208, 0.72)', fontSize: 12 }}>
              Create a room first to place furniture.
            </div>
          )}
        </div>
      )}

      {pendingPlacement && (
        <div style={{
          borderRadius: 14,
          border: '1px dashed rgba(233, 178, 98, 0.32)',
          background: 'rgba(49, 40, 35, 0.78)',
          padding: '12px 14px',
          color: '#f1e4d5',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          {pendingRoomName
            ? `Top view is ready for ${pendingRoomName}. Click where you want this furniture to be placed.`
            : 'Top view is ready. Click where you want this furniture to be placed.'}
        </div>
      )}
    </div>
  );

  const content = page === 'root'
    ? categoryListContent
    : page === 'furniture'
      ? categoryListContent
      : page === 'category'
        ? modelGridContent
        : detailContent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {content}
    </div>
  );
}
