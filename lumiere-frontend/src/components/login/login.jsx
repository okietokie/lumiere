import React, { useMemo, useState } from "react";
import { App, Checkbox, Form, Input, Modal } from "antd";
import {
  ArrowLeftOutlined,
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient.js";
import { authApi } from "../../api/auth.js";
import { getApiErrorMessage } from "../../utils/apiError.js";
import { storeAuthSession } from "../../utils/authStorage.js";
import { COLORS } from "../../utils/colors.js";
import {
  appendProjectIdToRedirect,
  clearDemoProjectDraft,
  getDemoProjectDraft,
} from "../../utils/demoProjectTransfer.js";
import landingBg from "../../assets/landing-page-bg.jpg";
import "./login.css";

export const AuthExperience = ({ initialMode = "login" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(initialMode);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { message } = App.useApp();

  const isSignup = mode === "signup";
  const authVars = useMemo(
    () => ({
      "--lm-bg": COLORS.background,
      "--lm-surface": COLORS.surface,
      "--lm-surface-low": "#241D19",
      "--lm-surface-high": "#342A24",
      "--lm-text": COLORS.text,
      "--lm-muted": `${COLORS.text}b8`,
      "--lm-muted-soft": `${COLORS.text}75`,
      "--lm-action": COLORS.action,
      "--lm-accent": COLORS.accent,
      "--lm-secondary": COLORS.secondary,
      "--lm-grid": COLORS.grid,
      "--lm-outline": `${COLORS.action}42`,
    }),
    []
  );

  const flipTo = (nextMode) => {
    setMode(nextMode);
    const query = location.search || "";
    window.history.replaceState(null, "", `${nextMode === "signup" ? "/register" : "/login"}${query}`);
  };

  const importDemoDraftProject = async (fallbackRedirect) => {
    const params = new URLSearchParams(location.search);
    const draft = getDemoProjectDraft();
    const shouldImport = params.get("demoImport") === "1" && draft?.scene_data;
    if (!shouldImport) return fallbackRedirect;

    const response = await axiosClient.post("/api/projects/save", {
      title: draft.title || "Untitled Room",
      scene_data: draft.scene_data,
      thumbnail_url: draft.thumbnail_url || null,
    });

    clearDemoProjectDraft();
    message.success("Your demo project has been saved to your account.");
    return appendProjectIdToRedirect(fallbackRedirect, response.data?.id);
  };

  const onLoginFinish = async (values) => {
    setLoginLoading(true);
    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
      });
      storeAuthSession(response.data);
      const redirect = new URLSearchParams(location.search).get("redirect");
      const defaultRedirect = new URLSearchParams(location.search).get("demoImport") === "1"
        ? "/user/room"
        : "/user/dashboard";
      const safeRedirect = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : defaultRedirect;
      const nextRedirect = await importDemoDraftProject(safeRedirect);
      message.success("Login Successful!");
      navigate(nextRedirect, { replace: true });
    } catch (error) {
      message.error(getApiErrorMessage(error, "Invalid login details. Please try again."));
    } finally {
      setLoginLoading(false);
    }
  };

  const onSignupFinish = async (values) => {
    setSignupLoading(true);
    try {
      await authApi.signup({
        name: values.fullname,
        email: values.email,
        password: values.password,
      });
      const loginResponse = await authApi.login({
        email: values.email,
        password: values.password,
      });
      storeAuthSession(loginResponse.data);
      const redirect = new URLSearchParams(location.search).get("redirect");
      const defaultRedirect = new URLSearchParams(location.search).get("demoImport") === "1"
        ? "/user/room"
        : "/user/dashboard";
      const safeRedirect = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : defaultRedirect;
      const nextRedirect = await importDemoDraftProject(safeRedirect);
      message.success("Account created successfully!");
      navigate(nextRedirect, { replace: true });
    } catch (error) {
      message.error(getApiErrorMessage(error, "Registration failed. Please try again."));
    } finally {
      setSignupLoading(false);
    }
  };

  const handleForgotSubmit = async (values) => {
    setForgotLoading(true);
    try {
      await authApi.forgotPassword({ email: values.resetEmail });
      message.success("If an account exists, a reset link has been sent!");
      setIsModalVisible(false);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Failed to send reset link. Please try again."));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="lm-auth-page" style={authVars}>
      <header className="lm-auth-header">
        <button className="lm-auth-back" type="button" onClick={() => navigate("/")}>
          <ArrowLeftOutlined />
          <span>Back Home</span>
        </button>
        <div className="lm-auth-wordmark">Lumiere Maison</div>
        <div className="lm-auth-header-note">Spatial Design Studio</div>
      </header>

      <main className="lm-auth-shell">
        <section className="lm-auth-visual" aria-hidden="true">
          <div className="lm-auth-visual-image" style={{ backgroundImage: `url(${landingBg})` }} />
          <div className="lm-auth-visual-overlay" />
          <div className="lm-auth-visual-grid" />
          <div className="lm-auth-visual-copy">
            <span className="lm-auth-kicker">{isSignup ? "Early Access" : "Client Portal"}</span>
            <h1>{isSignup ? "Build interiors with cinematic clarity." : "Return to your design workspace."}</h1>
            <p>
              {isSignup
                ? "Create your profile and start shaping presentation-ready spaces."
                : "Access saved concepts, continue room planning, and step back into your studio."}
            </p>
          </div>
          <div className="lm-auth-visual-line" />
        </section>

        <section className="lm-auth-panel">
          <div className={`lm-auth-card-shell ${isSignup ? "is-signup" : ""}`}>
            <div className="lm-auth-glow-card">
              <div className="lm-auth-glow-card-inner">
                <div className="lm-auth-flipper" aria-live="polite">
                  <div
                    className="lm-auth-face lm-auth-face-front"
                    aria-hidden={isSignup}
                    inert={isSignup ? "" : undefined}
                  >
                    <div className="lm-auth-intro">
                      <span className="lm-auth-intro-accent" />
                      <p className="lm-auth-eyebrow">Welcome Back</p>
                      <h2>Initialize Session</h2>
                      <p className="lm-auth-subcopy">Access your portfolio, projects, and presentation tools.</p>
                    </div>

                    <Form className="lm-auth-form" layout="vertical" onFinish={onLoginFinish} requiredMark={false}>
                      <Form.Item
                        label="Email Address"
                        name="email"
                        rules={[
                          { required: true, message: "Please enter your email address." },
                          { type: "email", message: "Please enter a valid email address." },
                        ]}
                      >
                        <Input prefix={<MailOutlined />} placeholder="curator@lumieremaison.com" autoComplete="email" />
                      </Form.Item>

                      <Form.Item
                        label="Security Key"
                        name="password"
                        rules={[{ required: true, message: "Please enter your password." }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Password"
                          autoComplete="current-password"
                        />
                      </Form.Item>

                      <div className="lm-auth-row">
                        <Form.Item className="lm-auth-check-wrap" name="remember" valuePropName="checked">
                          <Checkbox className="lm-auth-check">Remember this session</Checkbox>
                        </Form.Item>
                        <button className="lm-auth-text-button" type="button" onClick={() => setIsModalVisible(true)}>
                          Forgot password?
                        </button>
                      </div>

                      <button className="lm-auth-submit" type="submit" disabled={loginLoading}>
                        {loginLoading ? "Signing In..." : "Enter Studio"}
                      </button>
                    </Form>

                    <div className="lm-auth-switch">
                      <span>New to Lumiere?</span>
                      <button type="button" onClick={() => flipTo("signup")}>
                        Request access
                      </button>
                    </div>
                  </div>

                  <div
                    className="lm-auth-face lm-auth-face-back"
                    aria-hidden={!isSignup}
                    inert={!isSignup ? "" : undefined}
                  >
                    <div className="lm-auth-inline-switch">
                      <span>Already have access?</span>
                      <button type="button" onClick={() => flipTo("login")}>
                        Log in
                      </button>
                    </div>

                    <div className="lm-auth-intro">
                      <span className="lm-auth-intro-accent" />
                      <p className="lm-auth-eyebrow">Create Your Account</p>
                      <h2>Enter the Studio</h2>
                      <p className="lm-auth-subcopy">Create your profile and start shaping presentation-ready spaces.</p>
                    </div>

                    <Form className="lm-auth-form" layout="vertical" onFinish={onSignupFinish} requiredMark={false}>
                      <Form.Item
                        label="Full Name"
                        name="fullname"
                        rules={[{ required: true, message: "Please enter your full name." }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="Julianne Thorne" autoComplete="name" />
                      </Form.Item>

                      <Form.Item
                        label="Email Address"
                        name="email"
                        rules={[
                          { required: true, message: "Please enter your email address." },
                          { type: "email", message: "Please enter a valid email address." },
                        ]}
                      >
                        <Input prefix={<MailOutlined />} placeholder="curator@lumieremaison.com" autoComplete="email" />
                      </Form.Item>

                      <Form.Item
                        label="Password"
                        name="password"
                        rules={[
                          { required: true, message: "Please enter a password." },
                          { min: 6, message: "Password must be at least 6 characters." },
                        ]}
                      >
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" autoComplete="new-password" />
                      </Form.Item>

                      <Form.Item
                        label="Confirm Password"
                        name="confirm"
                        dependencies={["password"]}
                        rules={[
                          { required: true, message: "Please confirm your password." },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue("password") === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error("Passwords do not match."));
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Confirm password"
                          autoComplete="new-password"
                        />
                      </Form.Item>

                      <Form.Item
                        className="lm-auth-check-wrap lm-auth-terms-wrap"
                        name="terms"
                        valuePropName="checked"
                        rules={[
                          {
                            validator: (_, value) =>
                              value
                                ? Promise.resolve()
                                : Promise.reject(new Error("Please accept the terms to continue.")),
                          },
                        ]}
                      >
                        <Checkbox className="lm-auth-check lm-auth-terms">
                          <span>
                            I agree to the <Link to="/">Terms of Service</Link> and{" "}
                            <Link to="/">Privacy Policy</Link>.
                          </span>
                        </Checkbox>
                      </Form.Item>

                      <button className="lm-auth-submit" type="submit" disabled={signupLoading}>
                        {signupLoading ? "Creating Account..." : "Complete Registration"}
                      </button>
                    </Form>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Modal
        title="Reset Password"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="lm-auth-modal"
      >
        <Form className="lm-auth-modal-form" layout="vertical" onFinish={handleForgotSubmit} requiredMark={false}>
          <Form.Item
            label="Email Address"
            name="resetEmail"
            rules={[
              { required: true, message: "Please enter your email address." },
              { type: "email", message: "Please enter a valid email address." },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="curator@lumieremaison.com" autoComplete="email" />
          </Form.Item>
          <button className="lm-auth-submit" type="submit" disabled={forgotLoading}>
            {forgotLoading ? "Sending Link..." : "Send Reset Link"}
          </button>
        </Form>
      </Modal>
    </div>
  );
};

const Login = () => <AuthExperience initialMode="login" />;

export default Login;
