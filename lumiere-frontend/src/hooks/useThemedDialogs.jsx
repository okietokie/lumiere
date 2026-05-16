import { useCallback } from 'react';
import { App as AntApp } from 'antd';
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { COLORS } from '../utils/colors';

const DIALOG_TONES = {
  accent: {
    icon: <InfoCircleOutlined />,
    accent: COLORS.action,
    glow: 'rgba(169, 120, 78, 0.28)',
    buttonText: '#1A1008',
  },
  danger: {
    icon: <WarningOutlined />,
    accent: '#C97964',
    glow: 'rgba(201, 121, 100, 0.26)',
    buttonText: '#FFF7F2',
  },
  warning: {
    icon: <ExclamationCircleOutlined />,
    accent: '#D2A56C',
    glow: 'rgba(210, 165, 108, 0.25)',
    buttonText: '#1A1008',
  },
};

function DialogTitle({ icon, title, accent, glow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          color: accent,
          background: `radial-gradient(circle at 30% 30%, ${glow} 0%, rgba(255,255,255,0) 72%), ${COLORS.background}`,
          border: `1px solid ${accent}44`,
          boxShadow: `0 10px 24px ${glow}`,
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
          Lumiere Maison
        </div>
        <div style={{ color: COLORS.text, fontSize: 20, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          {title}
        </div>
      </div>
    </div>
  );
}

function DialogBody({ content }) {
  if (typeof content !== 'string') return content;

  return (
    <div style={{ color: `${COLORS.text}D9`, fontSize: 14, lineHeight: 1.7, paddingLeft: 56 }}>
      {content}
    </div>
  );
}

export default function useThemedDialogs() {
  const { modal } = AntApp.useApp();

  const openDialog = useCallback((options) => {
    const {
      title,
      content,
      tone = 'accent',
      okText = 'Confirm',
      cancelText = 'Cancel',
      okCancel = true,
      width = 470,
    } = options;

    const theme = DIALOG_TONES[tone] ?? DIALOG_TONES.accent;

    return new Promise((resolve) => {
      let settled = false;
      let dialogInstance = null;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      dialogInstance = modal.confirm({
        centered: true,
        closable: true,
        maskClosable: true,
        icon: null,
        width,
        okText,
        cancelText,
        okCancel,
        title: <DialogTitle icon={theme.icon} title={title} accent={theme.accent} glow={theme.glow} />,
        content: <DialogBody content={content} />,
        styles: {
          mask: {
            backdropFilter: 'blur(10px)',
            background: 'rgba(7, 6, 5, 0.62)',
          },
          content: {
            background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
            border: `1px solid ${COLORS.secondary}66`,
            borderRadius: 24,
            boxShadow: '0 28px 90px rgba(0,0,0,0.42)',
            overflow: 'hidden',
          },
          header: {
            background: 'transparent',
            borderBottom: `1px solid ${COLORS.secondary}30`,
            padding: '22px 24px 18px',
            marginBottom: 0,
          },
          body: {
            padding: '18px 24px 8px',
            background: 'transparent',
          },
          footer: {
            padding: '10px 24px 24px',
            borderTop: 'none',
          },
        },
        okButtonProps: {
          danger: false,
          style: {
            minWidth: okCancel ? 132 : 116,
            height: 42,
            borderRadius: 12,
            border: `1px solid ${theme.accent}`,
            background: theme.accent,
            color: theme.buttonText,
            boxShadow: `0 12px 28px ${theme.glow}`,
            fontWeight: 700,
          },
        },
        cancelButtonProps: okCancel
          ? {
              onClick: () => {
                finish(false);
                dialogInstance?.destroy();
              },
              style: {
                minWidth: 148,
                height: 42,
                borderRadius: 12,
                border: `1px solid ${COLORS.secondary}88`,
                background: 'rgba(255,255,255,0.02)',
                color: COLORS.text,
                fontWeight: 600,
              },
            }
          : {
              style: { display: 'none' },
        },
        onOk: () => finish(true),
        onCancel: () => finish(null),
        afterClose: () => finish(null),
      });
    });
  }, [modal]);

  const confirm = useCallback((options) => openDialog({ ...options, okCancel: true }), [openDialog]);
  const alert = useCallback((options) => openDialog({ okText: 'Okay', tone: 'accent', ...options, okCancel: false }), [openDialog]);

  return { confirm, alert };
}
