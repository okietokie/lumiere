import React from 'react';
import {
  Layout, Row, Col, Card, Typography, Button,
  Form, Input, message, Space, Divider
} from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined,
  EyeOutlined, TeamOutlined, ArrowsAltOutlined,
  ShoppingOutlined, ArrowRightOutlined,
  FacebookOutlined, TwitterOutlined,
  InstagramOutlined, YoutubeOutlined,
} from '@ant-design/icons';
import { authApi } from '../api/auth';
import { COLORS } from '../utils/colors';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Footer } = Layout;

//  Responsive hook 
function useIsMobile() {
  const [mobile, setMobile] = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

const LandingPage = () => {
  const [form]    = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authApi.signup({ name: values.name, email: values.email, password: values.password });
      message.success('Account created! Welcome to Lumiere.');
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { title: 'Custom Room Designs',         desc: 'Upload dimensions and see 3D layouts in real time.',           icon: <ArrowsAltOutlined />, color: COLORS.action  },
    { title: 'Furniture Suggestions',       desc: 'AI-powered suggestions matching your style and palette.',      icon: <ShoppingOutlined />,  color: '#FF6B6B'      },
    { title: 'AR/VR Preview',               desc: 'Visualize your room in augmented reality before buying.',      icon: <EyeOutlined />,       color: '#4ECDC4'      },
    { title: 'Collaborative Spaces',        desc: 'Share your designs with friends, clients, or your team.',     icon: <TeamOutlined />,      color: '#FFD166'      },
  ];

  const steps = [
    { n: '01', title: 'Create Profile',        desc: 'Sign up and set your style preferences.'          },
    { n: '02', title: 'Choose Template',       desc: 'Pick a template or upload your room dimensions.'  },
    { n: '03', title: 'Customise Design',      desc: 'Add furniture, change colours, arrange decor.'    },
    { n: '04', title: 'Save & Share',          desc: 'Export your design or share it with others.'      },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.background, overflowX: 'hidden' }}>

      {/*  Header */}
      <Header style={{
        background:   COLORS.surface,
        padding:      '0 16px',
        borderBottom: `1px solid ${COLORS.action}20`,
        position:     'sticky', top: 0, zIndex: 1000,
        height:       'auto', lineHeight: 'normal',
      }}>
        <Row justify="space-between" align="middle" style={{ padding: '12px 0', flexWrap: 'nowrap' }}>
          <Col flex="none">
            <Title level={3} style={{ margin: 0, color: COLORS.action, fontWeight: 700, fontSize: isMobile ? 20 : 26 }}>
              Lumiere
            </Title>
            {!isMobile && (
              <Text style={{ color: `${COLORS.text}70`, fontSize: 12 }}>Interior Design Platform</Text>
            )}
          </Col>
          <Col flex="none">
            <Space size={isMobile ? 6 : 12}>
              <Button
                size={isMobile ? 'small' : 'middle'}
                onClick={() => navigate('/user/room')}
                style={{ background: 'transparent', borderColor: COLORS.action, color: COLORS.action, borderRadius: 8, minHeight: 36 }}
              >
                {isMobile ? 'Demo' : 'Try Demo'}
              </Button>
              <Button
                type="primary" size={isMobile ? 'small' : 'middle'}
                onClick={() => document.getElementById('signup-section').scrollIntoView({ behavior: 'smooth' })}
                style={{ background: COLORS.action, borderColor: COLORS.action, borderRadius: 8, minHeight: 36, fontWeight: 600 }}
              >
                {isMobile ? 'Sign Up' : 'Get Started'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content>

        {/*  Hero */}
        <section style={{
          padding:    isMobile ? '48px 20px 40px' : '80px 40px',
          background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: isMobile ? 'center' : 'left' }}>
            <Title style={{
              color:      COLORS.text,
              fontSize:   isMobile ? 32 : 52,
              lineHeight: 1.15, margin: 0,
            }}>
              Transform your space with{' '}
              <span style={{ color: COLORS.action }}>Lumiere</span>
            </Title>
            <Paragraph style={{
              fontSize:   isMobile ? 16 : 20,
              color:      `${COLORS.text}80`,
              marginTop:  16, lineHeight: 1.7,
            }}>
              Your personalized interior design assistant — plan, visualise, and execute your dream room effortlessly.
            </Paragraph>
            <Space wrap style={{ marginTop: 28, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <Button
                type="primary" size="large"
                onClick={() => document.getElementById('signup-section').scrollIntoView({ behavior: 'smooth' })}
                style={{ background: COLORS.action, borderColor: COLORS.action, height: 48, padding: '0 28px', fontSize: 16, fontWeight: 600, borderRadius: 10 }}
              >
                Get Started <ArrowRightOutlined />
              </Button>
              <Button
                size="large" ghost
                onClick={() => navigate('/user/room')}
                style={{ borderColor: COLORS.action, color: COLORS.action, height: 48, padding: '0 28px', fontSize: 16, borderRadius: 10 }}
              >
                Live Demo
              </Button>
            </Space>
          </div>
        </section>

        {/*  Features */}
        <section style={{ padding: isMobile ? '48px 20px' : '80px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Title level={2} style={{ color: COLORS.text, marginBottom: 8 }}>What Lumiere Does</Title>
            <Text style={{ color: `${COLORS.text}60`, fontSize: 16 }}>Powerful tools to bring your design vision to life</Text>
          </div>
          <Row gutter={[20, 20]} justify="center" style={{ maxWidth: 960, margin: '0 auto' }}>
            {features.map((f, i) => (
              <Col xs={12} sm={12} md={6} key={i}>
                <Card
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.action}25`, borderRadius: 14, height: '100%', textAlign: 'center' }}
                  bodyStyle={{ padding: isMobile ? 16 : 24 }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `${f.color}20`, margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: f.color,
                  }}>
                    {f.icon}
                  </div>
                  <Text strong style={{ color: COLORS.text, fontSize: isMobile ? 13 : 15, display: 'block', marginBottom: 6 }}>
                    {f.title}
                  </Text>
                  <Text style={{ color: `${COLORS.text}60`, fontSize: isMobile ? 12 : 13, lineHeight: 1.5 }}>
                    {f.desc}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        {/*  How it works */}
        <section style={{
          padding:    isMobile ? '48px 20px' : '80px 40px',
          background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Title level={2} style={{ color: COLORS.text, marginBottom: 8 }}>How It Works</Title>
            <Text style={{ color: `${COLORS.text}60`, fontSize: 16 }}>Four simple steps to your perfect space</Text>
          </div>
          <Row gutter={[20, 20]} justify="center" style={{ maxWidth: 960, margin: '0 auto' }}>
            {steps.map((s, i) => (
              <Col xs={12} sm={12} md={6} key={i}>
                <div style={{
                  background:   COLORS.surface,
                  border:       `1px solid ${COLORS.action}25`,
                  borderRadius: 14,
                  padding:      isMobile ? '16px 14px' : '24px 20px',
                  textAlign:    'center',
                  height:       '100%',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `${COLORS.action}22`,
                    border: `2px solid ${COLORS.action}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: COLORS.action, fontWeight: 700, fontSize: 14,
                  }}>
                    {s.n}
                  </div>
                  <Text strong style={{ color: COLORS.text, fontSize: isMobile ? 13 : 15, display: 'block', marginBottom: 6 }}>
                    {s.title}
                  </Text>
                  <Text style={{ color: `${COLORS.text}60`, fontSize: isMobile ? 12 : 13, lineHeight: 1.5 }}>
                    {s.desc}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </section>

        {/*  Sign up */}
        <section id="signup-section" style={{ padding: isMobile ? '48px 20px 60px' : '80px 40px' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <Card
              style={{
                background:   COLORS.surface,
                border:       `1px solid ${COLORS.action}30`,
                borderRadius: 16,
                boxShadow:    '0 8px 40px rgba(0,0,0,0.35)',
              }}
              bodyStyle={{ padding: isMobile ? '28px 20px' : '36px 32px' }}
            >
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <Title level={2} style={{ color: COLORS.text, margin: 0 }}>Start Your Journey</Title>
                <Text style={{ color: `${COLORS.text}60`, fontSize: 14 }}>Create your free account in seconds</Text>
              </div>

              <Form form={form} name="signup" onFinish={onFinish} layout="vertical" size="large">
                <Form.Item name="name" rules={[{ required: true, message: 'Please enter your name' }, { min: 2 }]}>
                  <Input
                    prefix={<UserOutlined style={{ color: COLORS.action }} />}
                    placeholder="Full Name"
                    style={{ background: `${COLORS.background}80`, borderColor: `${COLORS.action}40`, color: COLORS.text, borderRadius: 8, height: 48 }}
                  />
                </Form.Item>

                <Form.Item name="email" rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]}>
                  <Input
                    prefix={<MailOutlined style={{ color: COLORS.action }} />}
                    placeholder="Email Address"
                    style={{ background: `${COLORS.background}80`, borderColor: `${COLORS.action}40`, color: COLORS.text, borderRadius: 8, height: 48 }}
                  />
                </Form.Item>

                <Form.Item name="password" rules={[{ required: true }, { min: 6, message: 'At least 6 characters' }]}>
                  <Input.Password
                    prefix={<LockOutlined style={{ color: COLORS.action }} />}
                    placeholder="Password"
                    style={{ background: `${COLORS.background}80`, borderColor: `${COLORS.action}40`, color: COLORS.text, borderRadius: 8, height: 48 }}
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm your password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: COLORS.action }} />}
                    placeholder="Confirm Password"
                    style={{ background: `${COLORS.background}80`, borderColor: `${COLORS.action}40`, color: COLORS.text, borderRadius: 8, height: 48 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
                  <Button
                    type="primary" htmlType="submit" loading={loading} block
                    style={{ background: COLORS.action, borderColor: COLORS.action, height: 52, fontSize: 16, fontWeight: 600, borderRadius: 10 }}
                  >
                    Create Free Account
                  </Button>
                </Form.Item>

                <Divider style={{ borderColor: `${COLORS.action}25`, color: `${COLORS.text}40`, fontSize: 12 }}>
                  By signing up you agree to our Terms & Privacy
                </Divider>

                <div style={{ textAlign: 'center' }}>
                  <Text style={{ color: `${COLORS.text}60`, fontSize: 14 }}>
                    Already have an account?{' '}
                    <Button type="link" style={{ padding: '0 4px', color: COLORS.action, fontWeight: 600, fontSize: 14 }}>
                      Log in here
                    </Button>
                  </Text>
                </div>
              </Form>
            </Card>
          </div>
        </section>
      </Content>

      {/*  Footer */}
      <Footer style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.action}20`, padding: isMobile ? '32px 20px' : '48px 40px' }}>
        <Row gutter={[32, 32]}>
          <Col xs={24} sm={8}>
            <Title level={4} style={{ color: COLORS.action, marginBottom: 8 }}>Lumiere</Title>
            <Text style={{ color: `${COLORS.text}60`, display: 'block', marginBottom: 16 }}>
              Your personalized interior design assistant.
            </Text>
            <Space size={16}>
              {[FacebookOutlined, TwitterOutlined, InstagramOutlined, YoutubeOutlined].map((Icon, i) => (
                <Icon key={i} style={{ color: COLORS.action, fontSize: 20, cursor: 'pointer' }} />
              ))}
            </Space>
          </Col>
          <Col xs={12} sm={8}>
            <Text strong style={{ color: COLORS.text, display: 'block', marginBottom: 12 }}>Quick Links</Text>
            {['Sign Up', 'Login', 'About', 'Contact'].map((l) => (
              <Button key={l} type="link" style={{ color: `${COLORS.text}60`, padding: 0, display: 'block', minHeight: 36 }}>{l}</Button>
            ))}
          </Col>
          <Col xs={12} sm={8}>
            <Text strong style={{ color: COLORS.text, display: 'block', marginBottom: 12 }}>Newsletter</Text>
            <Text style={{ color: `${COLORS.text}60`, fontSize: 13, display: 'block', marginBottom: 12 }}>
              Stay updated with design tips and new features.
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Your email"
                style={{ background: `${COLORS.background}80`, borderColor: `${COLORS.action}40`, color: COLORS.text }}
              />
              <Button type="primary" style={{ background: COLORS.action, borderColor: COLORS.action }}>Go</Button>
            </Space.Compact>
          </Col>
        </Row>
        <Divider style={{ borderColor: `${COLORS.action}25`, margin: '28px 0' }} />
        <Row justify="space-between" align="middle" wrap>
          <Col><Text style={{ color: `${COLORS.text}50`, fontSize: 13 }}>© {new Date().getFullYear()} Lumiere. All rights reserved.</Text></Col>
          <Col>
            <Space>
              <Button type="link" style={{ color: `${COLORS.text}50`, padding: 0, fontSize: 13 }}>Privacy</Button>
              <Button type="link" style={{ color: `${COLORS.text}50`, padding: 0, fontSize: 13 }}>Terms</Button>
            </Space>
          </Col>
        </Row>
      </Footer>
    </Layout>
  );
};

export default LandingPage;