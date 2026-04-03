import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Layout, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { COLORS } from '../../utils/colors.js';
import { authApi } from '../../api/auth.js';
import { getApiErrorMessage } from '../../utils/apiError.js';

const { Title, Text } = Typography;
const { Content } = Layout;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const token = searchParams.get('token');

  const onFinish = async (values) => {
    if (!token) {
      message.error('Reset token is missing from the URL.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        token: token,
        new_password: values.password,
      });
      message.success('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Failed to reset password. The link may have expired.');
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.background, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: COLORS.surface }}>
          <Title level={3} style={{ textAlign: 'center', color: COLORS.text }}>Reset Password</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
            Enter your new password below.
          </Text>

          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your new password!' },
                { min: 6, message: 'Minimum 6 characters.' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="New Password" size="large" />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm New Password" size="large" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ background: COLORS.action }}
            >
              Update Password
            </Button>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
};

export default ResetPassword;
