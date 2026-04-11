import React, { useState } from "react";
import { App, Checkbox, Form, Input, Modal } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth.js";
import { getApiErrorMessage } from "../../utils/apiError.js";
import { storeAuthSession } from "../../utils/authStorage.js";
import landingBg from "../../assets/landing-page-bg.jpg";
import "./login.css";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
      });
      storeAuthSession(response.data);
      message.success("Login Successful!");
      navigate("/user/dashboard", { replace: true });
    } catch (error) {
      message.error(getApiErrorMessage(error, "Invalid login details. Please try again."));
    } finally {
      setLoading(false);
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
    <div className="lm-login-page">
      <header className="lm-login-header">
        <button className="lm-login-back" type="button" onClick={() => navigate("/")}>
          <ArrowLeftOutlined />
          <span>Back Home</span>
        </button>
        <div className="lm-login-wordmark">Lumiere Maison</div>
        <div className="lm-login-header-note">Spatial Design Studio</div>
      </header>

      <main className="lm-login-shell">
        <section className="lm-login-visual" aria-hidden="true">
          <div className="lm-login-visual-image" style={{ backgroundImage: `url(${landingBg})` }} />
          <div className="lm-login-visual-overlay" />
          <div className="lm-login-visual-grid" />
          <div className="lm-login-visual-copy">
            <span className="lm-login-kicker">Client Portal</span>
            <h1>
              Return to your
              <br />
              design workspace.
            </h1>
            <p>
              Access saved concepts, continue room planning, and step back into the same cinematic
              environment that defines the Lumiere landing experience.
            </p>
          </div>
          <div className="lm-login-visual-line" />
        </section>

        <section className="lm-login-panel">
          <div className="lm-login-panel-inner">
            <div className="lm-login-intro">
              <span className="lm-login-intro-accent" />
              <p className="lm-login-eyebrow">Welcome Back</p>
              <h2>Initialize Session</h2>
              <p className="lm-login-subcopy">Access your portfolio, projects, and presentation tools.</p>
            </div>

            <Form className="lm-login-form" layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item
                label="Email Address"
                name="email"
                rules={[
                  { required: true, message: "Please enter your email address." },
                  { type: "email", message: "Please enter a valid email address." },
                ]}
              >
                <Input placeholder="curator@lumieremaison.com" autoComplete="email" />
              </Form.Item>

              <Form.Item
                label="Security Key"
                name="password"
                rules={[{ required: true, message: "Please enter your password." }]}
              >
                <Input.Password placeholder="••••••••" autoComplete="current-password" />
              </Form.Item>

              <div className="lm-login-row">
                <Form.Item className="lm-login-remember-wrap" name="remember" valuePropName="checked">
                  <Checkbox className="lm-login-remember">Remember this session</Checkbox>
                </Form.Item>
                <button
                  className="lm-login-link"
                  type="button"
                  onClick={() => setIsModalVisible(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button className="lm-login-submit" type="submit" disabled={loading}>
                {loading ? "Signing In..." : "Enter Studio"}
              </button>
            </Form>

            <div className="lm-login-footer">
              <p>
                New to Lumiere?
                <Link to="/register">Request access</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Modal
        title="Reset Password"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="lm-login-modal"
      >
        <Form className="lm-login-modal-form" layout="vertical" onFinish={handleForgotSubmit} requiredMark={false}>
          <Form.Item
            label="Email Address"
            name="resetEmail"
            rules={[
              { required: true, message: "Please enter your email address." },
              { type: "email", message: "Please enter a valid email address." },
            ]}
          >
            <Input placeholder="curator@lumieremaison.com" autoComplete="email" />
          </Form.Item>
          <button className="lm-login-submit" type="submit" disabled={forgotLoading}>
            {forgotLoading ? "Sending Link..." : "Send Reset Link"}
          </button>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;
