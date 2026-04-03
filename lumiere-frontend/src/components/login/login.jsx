import React, { useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, Checkbox, Divider, App, Row, Col, Modal } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { COLORS } from '../../utils/colors.js';
import { authApi } from '../../api/auth.js';
import { getApiErrorMessage } from '../../utils/apiError.js';
import { storeAuthSession } from '../../utils/authStorage.js';

const { Title, Text } = Typography;
const { Content } = Layout;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
      });
      storeAuthSession(response.data);
      message.success('Login Successful!');
      navigate('/user/room');
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Invalid login details. Please try again.');
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (values) => {
    setForgotLoading(true);
    try {
      await authApi.forgotPassword({ email: values.email });
      message.success('If an account exists, a reset link has been sent!');
      setIsModalVisible(false);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Failed to send reset link. Please try again.'));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.background }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="link"
          onClick={() => navigate('/')}
          style={{ position: 'absolute', top: 40, left: 40, color: COLORS.text }}
        >
          Back Home
        </Button>

        <Card style={{ width: 400, background: COLORS.surface, borderRadius: '16px' }}>
          <Title level={2} style={{ color: COLORS.action, textAlign: 'center' }}>Welcome Back</Title>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email.' }]}>
              <Input prefix={<UserOutlined />} placeholder="Email" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password.' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <Checkbox>Remember me</Checkbox>
              <Button type="link" onClick={() => setIsModalVisible(true)} style={{ padding: 0 }}>
                Forgot password?
              </Button>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ background: COLORS.action }}
            >
              Sign In
            </Button>
          </Form>

          <Divider><Text style={{ color: COLORS.text }}>OR</Text></Divider>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: COLORS.text }}>Don't have an account? </Text>
            <Link to="/register" style={{ color: COLORS.action }}>Sign Up</Link>
          </div>
        </Card>

        {/* Forgot Password Modal */}
        <Modal
          title="Reset Password"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
        >
          <Form onFinish={handleForgotSubmit} layout="vertical">
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email.' }]}>
              <Input prefix={<MailOutlined />} placeholder="Your account email" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={forgotLoading}
              style={{ background: COLORS.action }}
            >
              Send Reset Link
            </Button>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default Login;
