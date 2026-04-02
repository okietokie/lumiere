import React, { useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, App, Row, Col, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { COLORS } from '../utils/colors';
import { authApi } from '../api/auth.js';

const { Title, Text } = Typography;
const { Content } = Layout;

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
      message.success('Account created successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'Registration failed. Please try again.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.background }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="link"
          onClick={() => navigate('/')}
          style={{ position: 'absolute', top: 40, left: 40, color: COLORS.text }}
        >
          Back to Home
        </Button>

        <Row justify="center" style={{ width: '100%' }}>
          <Col xs={24} sm={20} md={14} lg={10} xl={8}>
            <Card style={{ borderRadius: '20px', background: COLORS.surface, border: `1px solid ${COLORS.action}30` }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Title level={2} style={{ color: COLORS.text }}>Join Lumiere</Title>
              </div>

              <Form layout="vertical" onFinish={onFinish} size="large">
                <Form.Item
                  name="fullname"
                  label={<span style={{ color: COLORS.text }}>Full Name</span>}
                  rules={[{ required: true, message: 'Please enter your full name.' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Full Name" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={<span style={{ color: COLORS.text }}>Email</span>}
                  rules={[{ required: true, type: 'email', message: 'Please enter a valid email.' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Email" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span style={{ color: COLORS.text }}>Password</span>}
                  rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters.' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                </Form.Item>

                <Form.Item
                  name="confirm"
                  label={<span style={{ color: COLORS.text }}>Confirm Password</span>}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm your password.' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match!'));
                      },
                    }),
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{ height: '50px', background: COLORS.action }}
                >
                  Create Account
                </Button>
              </Form>

              <Divider><Text style={{ color: COLORS.text }}>OR</Text></Divider>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: COLORS.text }}>Already have an account? </Text>
                <Link to="/login" style={{ color: COLORS.action }}>Sign In</Link>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default Register;