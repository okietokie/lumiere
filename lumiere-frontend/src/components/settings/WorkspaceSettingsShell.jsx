import { useMemo, useState } from "react";
import {
  AppstoreOutlined,
  BellOutlined,
  BgColorsOutlined,
  BugOutlined,
  CheckOutlined,
  CloudOutlined,
  CloseOutlined,
  ColumnWidthOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  InstagramOutlined,
  DribbbleOutlined,
  MailOutlined,
  MobileOutlined,
  NotificationOutlined,
  NumberOutlined,
  PushpinOutlined,
  ProductOutlined,
  ReadOutlined,
  RightOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SoundOutlined,
  TeamOutlined,
  FileTextOutlined,
  CopyrightOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { COLORS } from "../../utils/colors";
import "./WorkspaceSettingsShell.css";

const navItems = [
  {
    key: "account",
    label: "Account",
    icon: UserOutlined,
    disabled: true,
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: BgColorsOutlined,
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: BellOutlined,
  },
  {
    key: "storage",
    label: "Storage & Assets",
    icon: CloudOutlined,
    disabled: true,
  },
  {
    key: "collaboration",
    label: "Collaborations",
    icon: TeamOutlined,
    disabled: true,
    badge: "Coming soon",
  },
  {
    key: "security",
    label: "Security & Privacy",
    icon: SafetyCertificateOutlined,
    disabled: true,
    badge: "Coming soon",
  },
  {
    key: "billing",
    label: "Billing & Subscription",
    icon: CreditCardOutlined,
    disabled: true,
    badge: "Coming soon",
  },
  {
    key: "about",
    label: "About Lumiere",
    icon: InfoCircleOutlined,
  },
];

const themeOptions = [
  { key: "dark", label: "Dark", previewClass: "is-dark" },
  { key: "light", label: "Light", previewClass: "is-light" },
  { key: "midnight", label: "Midnight", previewClass: "is-midnight" },
  { key: "glass", label: "Glass", previewClass: "is-glass" },
  { key: "studio", label: "Studio", previewClass: "is-studio" },
];

const accentOptions = [
  "#D1965C",
  "#7C4DFF",
  "#E33C74",
  "#F59E0B",
  "#49C45A",
  "#2DB5E8",
  "linear-gradient(135deg, #ff9a3c 0%, #f24a74 38%, #8f59ff 70%, #2db5e8 100%)",
];

const segmentOptions = {
  sidebarPosition: ["Left", "Right"],
  uiStyle: ["Rounded", "Sharp"],
};

const canvasUnits = ["Centimeters (cm)", "Meters (m)", "Feet (ft)"];

const sectionMeta = {
  appearance: {
    title: "Appearance",
    copy: "Customize how Lumiere looks and feels.",
  },
  notifications: {
    title: "Notifications",
    copy: "Control how you receive notifications and updates.",
  },
  about: {
    title: "About Lumiere",
    copy: "App information, legal details and resources.",
  },
};

const aboutHighlights = [
  { key: "version", label: "Version", value: "1.0.0", icon: <PushpinOutlined /> },
  { key: "build", label: "Build", value: "0d73ee3", icon: <NumberOutlined /> },
  { key: "release", label: "Last Update", value: "Apr 29, 2026", icon: <ReadOutlined /> },
  { key: "environment", label: "Environment", value: "Development", icon: <EnvironmentOutlined /> },
];

const aboutResourcesPrimary = [
  {
    key: "whats-new",
    title: "What's New",
    copy: "Recent architecture and UI flow refactors across the app.",
    icon: <FileTextOutlined />,
  },
  {
    key: "help-center",
    title: "Help Center",
    copy: "Project notes, onboarding references and implementation guidance.",
    icon: <ReadOutlined />,
  },
  {
    key: "contact-support",
    title: "Contact Support",
    copy: "Reach the Lumiere team for product, design or technical help.",
    icon: <MailOutlined />,
  },
  {
    key: "report-bug",
    title: "Report a Bug",
    copy: "Flag editor, dashboard or rendering issues during active development.",
    icon: <BugOutlined />,
  },
];

const aboutResourcesLegal = [
  {
    key: "terms",
    title: "Terms of Service",
    copy: "Usage terms for the Lumiere platform and connected services.",
    icon: <FileTextOutlined />,
  },
  {
    key: "privacy",
    title: "Privacy Policy",
    copy: "How account, project and workspace data are handled.",
    icon: <SafetyCertificateOutlined />,
  },
  {
    key: "licenses",
    title: "Third-Party Licenses",
    copy: "Open-source packages and third-party libraries used in the stack.",
    icon: <CopyrightOutlined />,
  },
];

const notificationDeliveries = [
  {
    key: "inApp",
    title: "In-App Notifications",
    copy: "Receive notifications inside the application.",
    icon: <NotificationOutlined />,
    available: true,
  },
  {
    key: "email",
    title: "Email Notifications",
    copy: "Receive notifications via email.",
    icon: <MailOutlined />,
    available: true,
  },
  {
    key: "push",
    title: "Push Notifications",
    copy: "Receive push notifications on devices.",
    icon: <MobileOutlined />,
    available: true,
  },
];

const notificationCategories = [
  {
    key: "projectUpdates",
    title: "Project Updates",
    copy: "Changes to your projects, new versions and activity.",
    icon: <FolderOpenOutlined />,
    available: true,
  },
  {
    key: "collaboration",
    title: "Collaboration Activity",
    copy: "Comments, mentions, shared files and team updates.",
    icon: <TeamOutlined />,
    available: true,
  },
  {
    key: "clientReviews",
    title: "Client Reviews",
    copy: "Client comments, review requests and feedback.",
    icon: <MailOutlined />,
    available: true,
  },
  {
    key: "exports",
    title: "Export & Render",
    copy: "Render/export completed, failed or requires attention.",
    icon: <ProductOutlined />,
    available: true,
  },
  {
    key: "aiSuggestions",
    title: "AI Suggestions",
    copy: "New AI recommendations and smart suggestions.",
    icon: <RobotOutlined />,
    available: true,
  },
  {
    key: "storageSystem",
    title: "Storage & System",
    copy: "Storage limits, system alerts and performance.",
    icon: <DatabaseOutlined />,
    available: true,
  },
  {
    key: "marketing",
    title: "Marketing & Product",
    copy: "Product updates, new features and promotions.",
    icon: <SoundOutlined />,
    available: true,
  },
];

function SegmentControl({ options, value, onChange }) {
  return (
    <div className="settings-segment">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={active ? "settings-segment-btn is-active" : "settings-segment-btn"}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ToggleControl({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={checked ? "settings-toggle is-on" : "settings-toggle"}
      aria-pressed={checked}
    >
      <span className="settings-toggle-knob" />
    </button>
  );
}

function SettingCard({
  title,
  copy,
  icon,
  children,
  span = "default",
  muted = false,
}) {
  return (
    <div
      className={[
        "settings-card",
        span === "wide" ? "settings-card-wide" : "",
        muted ? "is-muted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="settings-card-header">
        <div className="settings-card-icon">{icon}</div>
        <div>
          <h4>{title}</h4>
          {copy && <p>{copy}</p>}
        </div>
      </div>
      <div className="settings-card-body">{children}</div>
    </div>
  );
}

function AboutLinkGroup({ items }) {
  return (
    <div className="about-links-card">
      {items.map((item) => (
        <button key={item.key} type="button" className="about-link-row">
          <span className="about-link-icon">{item.icon}</span>
          <span className="about-link-copy">
            <strong>{item.title}</strong>
            <small>{item.copy}</small>
          </span>
          <span className="about-link-arrow">
            <RightOutlined />
          </span>
        </button>
      ))}
    </div>
  );
}

export default function WorkspaceSettingsShell({
  open = true,
  onClose,
  variant = "embedded",
}) {
  const [activeSection, setActiveSection] = useState(
    variant === "modal" ? "notifications" : "appearance"
  );
  const [theme, setTheme] = useState("dark");
  const [uiScale, setUiScale] = useState(100);
  const [sidebarPosition, setSidebarPosition] = useState("Left");
  const [compactMode, setCompactMode] = useState(false);
  const [uiStyle, setUiStyle] = useState("Rounded");
  const [accentColor, setAccentColor] = useState(0);
  const [accentIntensity, setAccentIntensity] = useState(70);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapLines, setSnapLines] = useState(true);
  const [rulersEnabled, setRulersEnabled] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(30);
  const [measurementUnit, setMeasurementUnit] = useState(canvasUnits[0]);
  const [angleSnapping, setAngleSnapping] = useState(true);
  const [deliveryState, setDeliveryState] = useState({
    inApp: true,
    email: true,
    push: true,
  });
  const [categoryState, setCategoryState] = useState({
    projectUpdates: true,
    collaboration: true,
    clientReviews: true,
    exports: true,
    aiSuggestions: true,
    storageSystem: true,
    marketing: true,
  });
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  const shellClassName = useMemo(
    () =>
      [
        "workspace-settings-shell",
        variant === "modal" ? "is-modal" : "is-embedded",
      ].join(" "),
    [variant]
  );

  const activeMeta = sectionMeta[activeSection] ?? sectionMeta.appearance;
  const availableNotificationKeys = useMemo(
    () => notificationCategories.filter((item) => item.available).map((item) => item.key),
    []
  );

  const renderAppearanceSection = () => (
    <>
      <section className="workspace-settings-block">
        <div className="workspace-settings-block-heading">
          <h2>Theme</h2>
          <p>Choose your preferred theme.</p>
        </div>
        <div className="workspace-settings-theme-grid">
          {themeOptions.map((option) => {
            const selected = option.key === theme;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setTheme(option.key)}
                className={selected ? "theme-option-card is-selected" : "theme-option-card"}
              >
                <div className={`theme-option-preview ${option.previewClass}`}>
                  <span className="theme-preview-sidebar" />
                  <span className="theme-preview-line short" />
                  <span className="theme-preview-line medium" />
                  <span className="theme-preview-line long" />
                  <span className="theme-preview-panel" />
                </div>
                <div className="theme-option-footer">
                  <span>{option.label}</span>
                  {selected && (
                    <span className="theme-option-check">
                      <CheckOutlined />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="workspace-settings-block">
        <div className="workspace-settings-block-heading">
          <h2>UI Preferences</h2>
          <p>Adjust the look and layout.</p>
        </div>
        <div className="workspace-settings-grid">
          <SettingCard
            title="UI Scale"
            copy="Preview only for now."
            icon={<ExpandOutlined />}
            span="wide"
          >
            <div className="settings-slider-wrap">
              <input
                type="range"
                min="90"
                max="120"
                step="10"
                value={uiScale}
                onChange={(event) => setUiScale(Number(event.target.value))}
              />
              <div className="settings-slider-labels">
                <span>90%</span>
                <strong>{uiScale}%</strong>
                <span>110%</span>
                <span>120%</span>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="Sidebar Position"
            copy="Choose where navigation docks."
            icon={<ColumnWidthOutlined />}
          >
            <SegmentControl
              options={segmentOptions.sidebarPosition}
              value={sidebarPosition}
              onChange={setSidebarPosition}
            />
          </SettingCard>

          <SettingCard
            title="Compact Mode"
            copy="Show more content in less space."
            icon={<AppstoreOutlined />}
          >
            <ToggleControl checked={compactMode} onChange={setCompactMode} />
          </SettingCard>

          <SettingCard
            title="UI Style"
            copy="Choose the shape of UI elements."
            icon={<BgColorsOutlined />}
          >
            <SegmentControl
              options={segmentOptions.uiStyle}
              value={uiStyle}
              onChange={setUiStyle}
            />
          </SettingCard>

          <SettingCard
            title="Accent Color"
            copy="Choose your favorite accent color."
            icon={<BgColorsOutlined />}
            span="wide"
          >
            <div className="settings-accent-row">
              {accentOptions.map((option, index) => {
                const selected = accentColor === index;
                return (
                  <button
                    key={`${option}-${index}`}
                    type="button"
                    onClick={() => setAccentColor(index)}
                    className={selected ? "settings-accent-dot is-selected" : "settings-accent-dot"}
                    style={{ background: option }}
                    aria-label={`Accent color ${index + 1}`}
                  />
                );
              })}
              <button
                type="button"
                className="settings-accent-add"
                aria-label="Add accent color"
                disabled
              >
                +
              </button>
            </div>
          </SettingCard>

          <SettingCard
            title="Color Intensity"
            copy="Adjust the intensity of accent color."
            icon={<BgColorsOutlined />}
          >
            <div className="settings-slider-wrap">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={accentIntensity}
                onChange={(event) => setAccentIntensity(Number(event.target.value))}
              />
              <div className="settings-slider-labels">
                <span>0%</span>
                <strong>{accentIntensity}%</strong>
                <span>100%</span>
              </div>
            </div>
          </SettingCard>
        </div>
      </section>

      <section className="workspace-settings-block">
        <div className="workspace-settings-block-heading">
          <h2>Canvas Preferences</h2>
          <p>Customize the workspace and measurement settings.</p>
        </div>
        <div className="workspace-settings-grid">
          <SettingCard title="Grid" copy="Show grid in the editor." icon={<AppstoreOutlined />}>
            <ToggleControl checked={gridEnabled} onChange={setGridEnabled} />
          </SettingCard>

          <SettingCard title="Snap Lines" copy="Show snap lines." icon={<ColumnWidthOutlined />}>
            <ToggleControl checked={snapLines} onChange={setSnapLines} />
          </SettingCard>

          <SettingCard title="Rulers" copy="Show rulers." icon={<ExpandOutlined />}>
            <ToggleControl checked={rulersEnabled} onChange={setRulersEnabled} />
          </SettingCard>

          <SettingCard
            title="Grid Opacity"
            copy="Preview only for now."
            icon={<BgColorsOutlined />}
          >
            <div className="settings-slider-wrap">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={gridOpacity}
                onChange={(event) => setGridOpacity(Number(event.target.value))}
              />
              <div className="settings-slider-labels">
                <span>0%</span>
                <strong>{gridOpacity}%</strong>
                <span>100%</span>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            title="Measurement Unit"
            copy="Choose how values are displayed."
            icon={<ColumnWidthOutlined />}
          >
            <label className="settings-select-wrap">
              <select
                value={measurementUnit}
                onChange={(event) => setMeasurementUnit(event.target.value)}
              >
                {canvasUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </SettingCard>

          <SettingCard
            title="Angle Snapping"
            copy="Enable angle snapping."
            icon={<ExpandOutlined />}
          >
            <ToggleControl checked={angleSnapping} onChange={setAngleSnapping} />
          </SettingCard>
        </div>
      </section>
    </>
  );

  const renderNotificationsSection = () => (
    <>
      <section className="workspace-settings-block">
        <div className="workspace-settings-block-panel">
          <div className="workspace-settings-block-heading">
            <h2>Notification Delivery</h2>
            <p>Choose where you want to receive notifications.</p>
          </div>
          <div className="workspace-settings-delivery-grid">
            {notificationDeliveries.map((item) => (
              <SettingCard
                key={item.key}
                title={item.title}
                copy={item.copy}
                icon={item.icon}
                muted={!item.available}
              >
                <div className="settings-inline-toggle">
                  <ToggleControl
                    checked={deliveryState[item.key]}
                    onChange={(value) =>
                      setDeliveryState((current) => ({ ...current, [item.key]: value }))
                    }
                    disabled={!item.available}
                  />
                </div>
              </SettingCard>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace-settings-block">
        <div className="workspace-settings-block-panel">
          <div className="workspace-settings-block-heading settings-block-heading-row">
            <div>
              <h2>Notification Categories</h2>
              <p>Choose which types of notifications you want to receive.</p>
            </div>
            <div className="settings-link-actions">
              <button
                type="button"
                onClick={() =>
                  setCategoryState((current) =>
                    availableNotificationKeys.reduce(
                      (next, key) => ({ ...next, [key]: true }),
                      { ...current }
                    )
                  )
                }
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() =>
                  setCategoryState((current) =>
                    availableNotificationKeys.reduce(
                      (next, key) => ({ ...next, [key]: false }),
                      { ...current }
                    )
                  )
                }
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="settings-list-card">
            {notificationCategories.map((item) => (
              <div
                key={item.key}
                className={item.available ? "settings-list-row" : "settings-list-row is-disabled"}
              >
                <div className="settings-list-row-main">
                  <span className="settings-list-icon">{item.icon}</span>
                  <div className="settings-list-copy">
                    <strong>{item.title}</strong>
                    <small>{item.copy}</small>
                  </div>
                </div>
                <div className="settings-list-row-actions">
                  <ToggleControl
                    checked={categoryState[item.key]}
                    onChange={(value) =>
                      setCategoryState((current) => ({ ...current, [item.key]: value }))
                    }
                    disabled={!item.available}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace-settings-block">
        <div className="settings-quiet-hours-card">
          <div className="settings-quiet-hours-copy">
            <h2>Quiet Hours</h2>
            <p>Pause non-urgent notifications during specific hours.</p>
          </div>
          <div className="settings-quiet-hours-controls">
            <ToggleControl checked={quietHoursEnabled} onChange={setQuietHoursEnabled} />
            <label className="settings-time-select">
              <select value={quietStart} onChange={(event) => setQuietStart(event.target.value)}>
                <option>22:00</option>
                <option>23:00</option>
                <option>00:00</option>
              </select>
            </label>
            <span className="settings-time-arrow">
              <RightOutlined />
            </span>
            <label className="settings-time-select">
              <select value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)}>
                <option>07:00</option>
                <option>08:00</option>
                <option>09:00</option>
              </select>
            </label>
          </div>
        </div>
      </section>
    </>
  );

  const renderAboutSection = () => (
    <>
      <section className="workspace-settings-block">
        <div className="about-hero-card">
          <div className="about-hero-main">
            <div className="about-hero-badge">
              <span>✦</span>
              <span>✦</span>
              <span>✦</span>
            </div>
            <div className="about-hero-copy">
              <div className="about-hero-title-row">
                <h2>Lumiere Maison</h2>
                <span className="workspace-settings-badge">v1.0.0</span>
              </div>
              <p>Interior design workspace spanning auth, dashboard, and live 2D/3D editing.</p>
            </div>
          </div>

          <div className="about-stats-grid">
            {aboutHighlights.map((item) => (
              <div key={item.key} className="about-stat-item">
                <span className="about-stat-icon">{item.icon}</span>
                <div className="about-stat-copy">
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace-settings-block">
        <AboutLinkGroup items={aboutResourcesPrimary} />
      </section>

      <section className="workspace-settings-block">
        <AboutLinkGroup items={aboutResourcesLegal} />
      </section>

      <section className="workspace-settings-block">
        <div className="about-footer-card">
          <p>© 2026 Lumiere Maison. All rights reserved.</p>
          <div className="about-footer-icons">
            <button type="button" className="about-footer-icon" aria-label="Website">
              <GlobalOutlined />
            </button>
            <button type="button" className="about-footer-icon" aria-label="Instagram">
              <InstagramOutlined />
            </button>
            <button type="button" className="about-footer-icon" aria-label="Dribbble">
              <DribbbleOutlined />
            </button>
          </div>
        </div>
      </section>
    </>
  );

  if (!open) return null;

  return (
    <div className={shellClassName}>
      {variant === "modal" && (
        <button
          type="button"
          className="workspace-settings-backdrop"
          aria-label="Close settings"
          onClick={onClose}
        />
      )}

      <section
        className="workspace-settings-panel"
        onWheelCapture={variant === "modal" ? (event) => event.stopPropagation() : undefined}
        style={{
          "--settings-bg": COLORS.background,
          "--settings-surface": COLORS.surface,
          "--settings-text": COLORS.text,
          "--settings-muted": COLORS.secondary,
          "--settings-accent": COLORS.action,
          "--settings-accent-soft": `${COLORS.action}22`,
          "--settings-line": "rgba(234, 216, 195, 0.10)",
          "--settings-line-soft": "rgba(234, 216, 195, 0.06)",
        }}
      >
        <aside className="workspace-settings-sidebar">
          <div className="workspace-settings-sidebar-top">
            <button
              type="button"
              onClick={onClose}
              className="workspace-settings-close"
              aria-label="Close settings"
            >
              <CloseOutlined />
            </button>
          </div>

          <nav className="workspace-settings-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeSection;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (!item.disabled) setActiveSection(item.key);
                  }}
                  disabled={item.disabled}
                  className={[
                    "workspace-settings-nav-item",
                    active ? "is-active" : "",
                    item.disabled ? "is-disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="workspace-settings-nav-icon">
                    <Icon />
                  </span>
                  <span className="workspace-settings-nav-copy">
                    <strong>{item.label}</strong>
                  </span>
                  {item.badge && <span className="workspace-settings-badge">{item.badge}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="workspace-settings-content">
          <header className="workspace-settings-header">
            <div>
              <h1>{activeMeta.title}</h1>
              <p>{activeMeta.copy}</p>
            </div>
          </header>
          {activeSection === "notifications"
            ? renderNotificationsSection()
            : activeSection === "about"
              ? renderAboutSection()
              : renderAppearanceSection()}
        </div>
      </section>
    </div>
  );
}
