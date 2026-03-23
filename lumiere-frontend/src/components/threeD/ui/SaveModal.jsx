// src/components/ui/SaveModal.jsx
import { useState, useRef } from 'react';
import { Modal, Input, Switch, Segmented } from 'antd';
import {
  SaveOutlined, CameraOutlined, ExportOutlined,
  ImportOutlined, ClockCircleOutlined, CheckCircleOutlined,
  LoadingOutlined, WarningOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import { gsap } from 'gsap';
import { COLORS } from '../../../utils/colors';
import RecordingPanel from './RecordingPanel';

const C = {
  bg:      COLORS.surface,
  bgDeep:  COLORS.background,
  border:  `${COLORS.secondary}60`,
  text:    COLORS.text,
  subtext: COLORS.secondary,
  action:  COLORS.action,
  success: '#7FB069',
  error:   '#C0504D',
};

const STATUS_ICON = {
  idle:   <SaveOutlined />,
  saving: <LoadingOutlined spin />,
  saved:  <CheckCircleOutlined />,
  error:  <WarningOutlined />,
};
const STATUS_LABEL = {
  idle:   'Save to Cloud',
  saving: 'Saving…',
  saved:  'Saved',
  error:  'Save Failed — Retry',
};
const STATUS_BG = {
  idle:   C.action,
  saving: C.action,
  saved:  C.success,
  error:  C.error,
};

export default function SaveModal({
  open, onClose,
  projectName, setProjectName,
  saveStatus, saveProject,
  downloadSnapshot, exportJSON, importJSON,
  autosaveEnabled, setAutosaveEnabled,
  // Recording props — passed from RoomScene via useRecorder
  recorderProps,
}) {
  const [localName,    setLocalName]    = useState(projectName);
  const [snapshotMode, setSnapshotMode] = useState('current');
  const btnRef = useRef(null);

  const prevOpen = useRef(false);
  if (open && !prevOpen.current) { setLocalName(projectName); }
  prevOpen.current = open;

  const handleSave = async () => {
    if (btnRef.current)
      gsap.fromTo(btnRef.current, { scale: 0.95 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });
    await saveProject(localName.trim() || 'Untitled Room', true);
    setProjectName(localName.trim() || 'Untitled Room');
  };

  const hasRecorder = !!recorderProps;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={hasRecorder ? 460 : 420}
      title={
        <span style={{ marginLeft: 12, color: C.text, fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500 }}>
          <SaveOutlined style={{ color: C.action, marginRight: 8 }} />
          Save Project
        </span>
      }
      styles={{
        content: {
          background:   C.bg,
          border:       `1px solid ${C.border}`,
          borderRadius: 16,
          padding:      '20px 24px 24px',
        },
        header: {
          background:    C.bg,
          borderBottom:  `1px solid ${C.border}`,
          borderRadius:  '16px 16px 0 0',
          paddingBottom: 12,
          marginBottom:  0,
        },
        mask: { backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.55)' },
        body: { padding: 0, paddingTop: 20 },
      }}
    >
      <style>{`
        .lumiere-save-modal .ant-input {
          background:   ${C.bgDeep} !important;
          border-color: ${C.border} !important;
          color:        ${C.text} !important;
          border-radius: 8px !important;
        }
        .lumiere-save-modal .ant-input::placeholder { color: ${C.subtext} !important; }
        .lumiere-save-modal .ant-input:focus,
        .lumiere-save-modal .ant-input:hover {
          border-color: ${C.action} !important;
          box-shadow: 0 0 0 2px ${C.action}25 !important;
        }
        .lumiere-save-modal .ant-segmented {
          background:    ${C.bgDeep} !important;
          border-radius: 8px !important;
          padding:       3px !important;
        }
        .lumiere-save-modal .ant-segmented-item-label { color: ${C.subtext} !important; font-size: 12px; }
        .lumiere-save-modal .ant-segmented-item-selected .ant-segmented-item-label { color: ${C.text} !important; }
        .lumiere-save-modal .ant-segmented-item-selected {
          background:    ${C.bg} !important;
          border-radius: 6px !important;
        }
        .lumiere-save-modal .ant-switch       { background: ${COLORS.accent} !important; }
        .lumiere-save-modal .ant-switch-checked{ background: ${C.action} !important; }
        .lumiere-save-modal .ant-modal-close  { color: ${C.subtext} !important; }
        .lumiere-save-modal .ant-modal-close:hover { color: ${C.text} !important; }
      `}</style>

      <div className="lumiere-save-modal" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Project name ──────────────────────────────────────── */}
        <div>
          <Label>Project Name</Label>
          <Input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onPressEnter={handleSave}
            placeholder="e.g. Living Room Design"
            maxLength={60}
          />
        </div>

        {/* ── Save button ───────────────────────────────────────── */}
        <button
          ref={btnRef}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            8,
            width:          '100%',
            height:         44,
            borderRadius:   10,
            border:         'none',
            background:     STATUS_BG[saveStatus] ?? C.action,
            color:          '#1A1008',
            fontSize:       14,
            fontWeight:     600,
            fontFamily:     'Inter, sans-serif',
            cursor:         saveStatus === 'saving' ? 'wait' : 'pointer',
            transition:     'background 0.2s',
            letterSpacing:  '0.02em',
            boxShadow:      saveStatus === 'idle' ? `0 0 18px ${C.action}35` : 'none',
          }}
        >
          {STATUS_ICON[saveStatus]}
          {STATUS_LABEL[saveStatus]}
        </button>

        <Divider />

        {/* ── Snapshot ─────────────────────────────────────────── */}
        <div>
          <Label>Snapshot</Label>
          <Segmented
            options={[
              { label: 'Current',  value: 'current' },
              { label: 'Top Down', value: 'top'     },
              { label: 'Front',    value: 'front'   },
            ]}
            value={snapshotMode}
            onChange={setSnapshotMode}
            block
            style={{ marginBottom: 10 }}
          />
          <GhostButton icon={<CameraOutlined />} onClick={() => downloadSnapshot(snapshotMode)}>
            Download Snapshot (.png)
          </GhostButton>
        </div>

        <Divider />

        {/* ── Recording ────────────────────────────────────────── */}
        {hasRecorder && (
          <>
            <div>
              <Label>
                <VideoCameraOutlined style={{ marginRight: 5 }} />
                Record Room
              </Label>
              <RecordingPanel {...recorderProps} />
            </div>
            <Divider />
          </>
        )}

        {/* ── Export / Import ───────────────────────────────────── */}
        <div>
          <Label>Scene File</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton icon={<ExportOutlined />} onClick={exportJSON}>Export JSON</GhostButton>
            <GhostButton icon={<ImportOutlined />} onClick={importJSON}>Import JSON</GhostButton>
          </div>
        </div>

        <Divider />

        {/* ── Autosave ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: C.subtext, fontSize: 14 }} />
            <span style={{ color: C.text, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              Autosave every 30s
            </span>
          </div>
          <Switch checked={autosaveEnabled} onChange={setAutosaveEnabled} />
        </div>

      </div>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <div style={{
      color:          COLORS.secondary,
      fontSize:       10,
      fontWeight:     600,
      letterSpacing:  '0.12em',
      textTransform:  'uppercase',
      fontFamily:     'Inter, sans-serif',
      marginBottom:   8,
      display:        'flex',
      alignItems:     'center',
    }}>
      {children}
    </div>
  );
}

function GhostButton({ icon, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            6,
        padding:        '9px 12px',
        borderRadius:   8,
        border:         `1px solid ${COLORS.secondary}60`,
        background:     'transparent',
        color:          COLORS.text,
        fontSize:       12,
        fontFamily:     'Inter, sans-serif',
        cursor:         'pointer',
        transition:     'border-color 0.15s, background 0.15s',
        whiteSpace:     'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.action;
        e.currentTarget.style.background  = `${COLORS.action}12`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${COLORS.secondary}60`;
        e.currentTarget.style.background  = 'transparent';
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: `${COLORS.secondary}30` }} />;
}