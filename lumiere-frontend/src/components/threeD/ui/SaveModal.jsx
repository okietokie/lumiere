import { useEffect, useState, useRef } from 'react';
import { Modal, Input, Switch } from 'antd';
import {
  SaveOutlined, CameraOutlined, ExportOutlined,
  ImportOutlined, ClockCircleOutlined, CheckCircleOutlined,
  LoadingOutlined, WarningOutlined, VideoCameraOutlined,
  LinkOutlined, MobileOutlined,
} from '@ant-design/icons';
import { gsap } from 'gsap';
import { COLORS } from '../../../utils/colors';
import RecordingPanel from './RecordingPanel';

const C = {
  bg: COLORS.surface,
  bgDeep: COLORS.background,
  border: `${COLORS.secondary}60`,
  text: COLORS.text,
  subtext: COLORS.secondary,
  action: COLORS.action,
  success: '#7FB069',
  error: '#C0504D',
};

const STATUS_ICON = {
  idle: <SaveOutlined />,
  saving: <LoadingOutlined spin />,
  saved: <CheckCircleOutlined />,
  error: <WarningOutlined />,
};

const STATUS_LABEL = {
  idle: 'Save to Cloud',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save Failed - Retry',
};

const STATUS_BG = {
  idle: C.action,
  saving: C.action,
  saved: C.success,
  error: C.error,
};

export default function SaveModal({
  open, onClose,
  currentProjectId,
  projectName, setProjectName,
  saveStatus, saveProject,
  downloadSnapshot, exportJSON, importJSON,
  shareUrl, copyShareLink,
  autosaveEnabled, setAutosaveEnabled,
  recorderProps,
}) {
  const [localName, setLocalName] = useState(projectName);
  const [renameChoiceOpen, setRenameChoiceOpen] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (open) setLocalName(projectName || 'Untitled Room');
    else setRenameChoiceOpen(false);
  }, [open, projectName]);

  const existingName = (projectName || 'Untitled Room').trim();
  const nextName = localName.trim() || 'Untitled Room';
  const isRenamingSavedProject = Boolean(currentProjectId) && nextName !== existingName;

  const performSave = async ({ createNew = false } = {}) => {
    if (btnRef.current) {
      gsap.fromTo(btnRef.current, { scale: 0.95 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });
    }
    try {
      await saveProject(nextName, true, { createNew });
      setProjectName(nextName);
      setRenameChoiceOpen(false);
    } catch (error) {
      alert(error?.response?.data?.detail || error?.message || 'Failed to save project.');
    }
  };

  const handleSave = async () => {
    if (isRenamingSavedProject) {
      setRenameChoiceOpen(true);
      return;
    }

    await performSave();
  };

  const hasRecorder = !!recorderProps;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={hasRecorder ? 500 : 460}
      title={(
        <span style={{ marginLeft: 12, color: C.text, fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500 }}>
          <SaveOutlined style={{ color: C.action, marginRight: 8 }} />
          Save Project
        </span>
      )}
      styles={{
        content: {
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '20px 24px 24px',
        },
        header: {
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          borderRadius: '16px 16px 0 0',
          paddingBottom: 12,
          marginBottom: 0,
        },
        mask: { backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.55)' },
        body: { padding: 0, paddingTop: 20 },
      }}
    >
      <style>{`
        .lumiere-save-modal .ant-input {
          background: ${C.bgDeep} !important;
          border-color: ${C.border} !important;
          color: ${C.text} !important;
          border-radius: 8px !important;
        }
        .lumiere-save-modal .ant-input::placeholder { color: ${C.subtext} !important; }
        .lumiere-save-modal .ant-input:focus,
        .lumiere-save-modal .ant-input:hover {
          border-color: ${C.action} !important;
          box-shadow: 0 0 0 2px ${C.action}25 !important;
        }
        .lumiere-save-modal .ant-switch { background: ${COLORS.accent} !important; }
        .lumiere-save-modal .ant-switch-checked { background: ${C.action} !important; }
        .lumiere-save-modal .ant-modal-close { color: ${C.subtext} !important; }
        .lumiere-save-modal .ant-modal-close:hover { color: ${C.text} !important; }
      `}</style>

      <div className="lumiere-save-modal" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <Label>Project Name</Label>
          {currentProjectId && (
            <div style={{ color: C.subtext, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
              Saved as {existingName}
            </div>
          )}
          <Input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onPressEnter={handleSave}
            placeholder="e.g. Living Room Design"
            maxLength={60}
          />
        </div>

        <button
          ref={btnRef}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: STATUS_BG[saveStatus] ?? C.action,
            color: '#1A1008',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: saveStatus === 'saving' ? 'wait' : 'pointer',
            transition: 'background 0.2s',
            letterSpacing: '0.02em',
            boxShadow: saveStatus === 'idle' ? `0 0 18px ${C.action}35` : 'none',
          }}
        >
          {STATUS_ICON[saveStatus]}
          {STATUS_LABEL[saveStatus]}
        </button>

        <Divider />

        <div>
          <Label>Snapshot</Label>
          <GhostButton icon={<CameraOutlined />} onClick={downloadSnapshot}>
            Download Snapshot (.png)
          </GhostButton>
        </div>

        <Divider />

        <div>
          <Label>
            <MobileOutlined style={{ marginRight: 5 }} />
            Share In 3D
          </Label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 12,
            border: `1px solid ${COLORS.secondary}35`,
            background: C.bgDeep,
          }}>
            <div style={{ color: C.subtext, fontSize: 12, lineHeight: 1.55 }}>
              Create a public viewer link for this model.
            </div>
            <GhostButton icon={<LinkOutlined />} onClick={copyShareLink}>Create Viewer Link</GhostButton>
            <div style={{
              color: shareUrl ? COLORS.text : C.subtext,
              fontSize: 11,
              lineHeight: 1.5,
              wordBreak: 'break-all',
              padding: '8px 10px',
              borderRadius: 8,
              background: `${COLORS.background}80`,
              border: `1px solid ${COLORS.secondary}25`,
            }}>
              {shareUrl || 'Save once to generate a public viewer link.'}
            </div>
          </div>
        </div>

        <Divider />

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

        <div>
          <Label>Scene File</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton icon={<ExportOutlined />} onClick={exportJSON}>Export JSON</GhostButton>
            <GhostButton icon={<ImportOutlined />} onClick={importJSON}>Import JSON</GhostButton>
          </div>
        </div>

        <Divider />

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

      <Modal
        open={renameChoiceOpen}
        onCancel={() => setRenameChoiceOpen(false)}
        footer={null}
        width={420}
        title="Save renamed project"
        styles={{
          content: {
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
          },
          header: {
            background: C.bg,
            borderBottom: `1px solid ${C.border}`,
          },
          body: { paddingTop: 16 },
          mask: { backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.55)' },
        }}
      >
        <div style={{ color: C.text, fontSize: 13, lineHeight: 1.65, marginBottom: 16 }}>
          This project is already saved as <strong>{existingName}</strong>. Save it as <strong>{nextName}</strong> by replacing the old project, or create a separate project with the new name.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ChoiceButton onClick={() => performSave({ createNew: false })} disabled={saveStatus === 'saving'}>
            Replace old project
          </ChoiceButton>
          <ChoiceButton onClick={() => performSave({ createNew: true })} disabled={saveStatus === 'saving'} primary>
            Create new project
          </ChoiceButton>
        </div>
      </Modal>
    </Modal>
  );
}

function Label({ children }) {
  return (
    <div style={{
      color: COLORS.secondary,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      fontFamily: 'Inter, sans-serif',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
    }}>
      {children}
    </div>
  );
}

function GhostButton({ icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '9px 12px',
        borderRadius: 8,
        border: `1px solid ${COLORS.secondary}60`,
        background: 'transparent',
        color: COLORS.text,
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        whiteSpace: 'normal',
        textAlign: 'center',
        lineHeight: 1.25,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.action;
        e.currentTarget.style.background = `${COLORS.action}12`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${COLORS.secondary}60`;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function ChoiceButton({ onClick, disabled, primary = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 40,
        borderRadius: 8,
        border: `1px solid ${primary ? COLORS.action : `${COLORS.secondary}60`}`,
        background: primary ? COLORS.action : 'transparent',
        color: primary ? '#1A1008' : COLORS.text,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        cursor: disabled ? 'wait' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: `${COLORS.secondary}30` }} />;
}
