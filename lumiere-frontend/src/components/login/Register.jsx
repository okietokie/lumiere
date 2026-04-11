import React, { useState } from "react";
import { App, Checkbox, Form, Input } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth.js";
import { getApiErrorMessage } from "../../utils/apiError.js";
import landingBg from "../../assets/landing-page-bg.jpg";
import "./register.css";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authApi.signup({
        name: values.fullname,
        email: values.email,
        password: values.password,
      });
      message.success("Account created successfully!");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lm-register-page">
      <header className="lm-register-header">
        <button className="lm-register-back" type="button" onClick={() => navigate("/")}>
          <ArrowLeftOutlined />
          <span>Back Home</span>
        </button>
        <div className="lm-register-wordmark">Lumiere Maison</div>
        <div className="lm-register-header-note">Spatial Design Studio</div>
      </header>

      <main className="lm-register-shell">
        <section className="lm-register-visual" aria-hidden="true">
          <div
            className="lm-register-visual-image"
            style={{ backgroundImage: `url(${landingBg})` }}
          />
          <div className="lm-register-visual-overlay" />
          <div className="lm-register-visual-grid" />
          <div className="lm-register-visual-copy">
            <span className="lm-register-kicker">Early Access</span>
            <h1>
              Build interiors with
              <br />
              cinematic clarity.
            </h1>
            <p>
              Join Lumiere Maison to design, curate, and present spatial concepts with the same
              elevated atmosphere as your landing experience.
            </p>
          </div>
          <div className="lm-register-visual-line" />
        </section>

        <section className="lm-register-panel">
          <div className="lm-register-panel-inner">
            <div className="lm-register-intro">
              <span className="lm-register-intro-accent" />
              <p className="lm-register-eyebrow">Create Your Account</p>
              <h2>Enter the Studio</h2>
              <p className="lm-register-subcopy">
                Create your profile and start shaping presentation-ready spaces.
              </p>
            </div>

            <Form className="lm-register-form" layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item
                label="Full Name"
                name="fullname"
                rules={[{ required: true, message: "Please enter your full name." }]}
              >
                <Input placeholder="Julianne Thorne" autoComplete="name" />
              </Form.Item>

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

              <div className="lm-register-form-row">
                <Form.Item
                  label="Password"
                  name="password"
                  rules={[
                    { required: true, message: "Please enter a password." },
                    { min: 6, message: "Password must be at least 6 characters." },
                  ]}
                >
                  <Input.Password placeholder="••••••••" autoComplete="new-password" />
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
                  <Input.Password placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>
              </div>

              <Form.Item
                className="lm-register-terms-wrap"
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
                <Checkbox className="lm-register-terms">
                  <span>
                    I agree to the <Link to="/">Terms of Service</Link> and{" "}
                    <Link to="/">Privacy Policy</Link>.
                  </span>
                </Checkbox>
              </Form.Item>

              <button className="lm-register-submit" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Complete Registration"}
              </button>
            </Form>

            <div className="lm-register-footer">
              <p>
                Already have access?
                <Link to="/login">Login here</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Register;
