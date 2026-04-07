import React from 'react';
import { 
  Layout, 
  Row, 
  Col, 
  Card, 
  Typography, 
  Button, 
  Form, 
  Input, 
  message,
  Space,
  Divider,
  Steps,
  Carousel
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined,
  RobotOutlined,
  EyeOutlined,
  BgColorsOutlined,
  DollarOutlined,
  UploadOutlined,
  TeamOutlined,
  ArrowsAltOutlined,
  ShoppingOutlined,
  FacebookOutlined,
  TwitterOutlined,
  InstagramOutlined,
  YoutubeOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { COLORS } from '../utils/colors';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Footer } = Layout;
const { Step } = Steps;

const LandingPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await authApi.signup({
        name: values.name,
        email: values.email,
        password: values.password
      });
      
      message.success('Account created successfully! Welcome to Lumiere.');
      form.resetFields();
      
      console.log('User created:', response.data);
      
    } catch (error) {
      message.error(
        error.response?.data?.detail || 'Failed to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const heroImages = [
    {
      title: "Living Room",
      description: "Modern living room design with AI-curated furniture"
    },
    {
      title: "Home Office",
      description: "Productive workspace designed for comfort and focus"
    },
    {
      title: "Bedroom",
      description: "Cozy bedroom layouts for restful nights"
    },
    {
      title: "Kitchen",
      description: "Functional and beautiful kitchen designs"
    }
  ];

  const features = [
    {
      title: "Custom Room Designs",
      description: "Upload your room dimensions and see 3D layouts in real time.",
      icon: <ArrowsAltOutlined />,
      color: COLORS.action
    },
    {
      title: "Furniture & Decor Suggestions",
      description: "Get AI-powered suggestions to match your style and color palette.",
      icon: <ShoppingOutlined />,
      color: "#FF6B6B"
    },
    {
      title: "AR/VR Preview",
      description: "Visualize your room in augmented reality before buying or arranging.",
      icon: <EyeOutlined />,
      color: "#4ECDC4"
    },
    {
      title: "Collaborative Spaces",
      description: "Share your designs with friends, clients, or your team.",
      icon: <TeamOutlined />,
      color: "#FFD166"
    }
  ];

  const howItWorksSteps = [
    {
      title: "Signup & Create Profile",
      description: "Create your account and tell us about your style preferences"
    },
    {
      title: "Upload Room or Choose Template",
      description: "Upload room dimensions or select from our template library"
    },
    {
      title: "Customize Design",
      description: "Add furniture, change colors, and arrange decor items"
    },
    {
      title: "Save, Share & Export",
      description: "Save your design, share with others, or export for implementation"
    }
  ];

  return (
    <Layout style={{ 
      minHeight: '100vh',
      background: COLORS.background 
    }}>
      {/* Header */}
      <Header style={{ 
        background: COLORS.surface, 
        padding: '0 24px',
        borderBottom: `1px solid ${COLORS.action}20`,
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <Row justify="space-between" align="middle" style={{ height: '64px' }}>
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={3} style={{ 
                margin: 0, 
                color: COLORS.action,
                fontWeight: 600,
                fontSize: 'clamp(1.5rem, 4vw, 2rem)'
              }}>
                Lumiere
              </Title>
              <Text style={{ 
                color: `${COLORS.text}90`,
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
              }}>
                Interior Design Platform
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button 
                type="primary" 
                size="middle"
                style={{
                  background: COLORS.action,
                  borderColor: COLORS.action,
                  fontWeight: 500
                }}
                
              >
                Login
              </Button>
              <Button 
                type="primary" 
                size="middle"
                onClick={() => navigate('/canvas')}
                style={{
                  background: COLORS.action,
                  borderColor: COLORS.action
                }}
              >
                Get Started
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content>
        {/* Hero Section */}
        <section style={{ 
          padding: '80px 24px',
          background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Row gutter={[48, 48]} align="middle" justify="center">
            <Col xs={24} lg={12}>
              <Space direction="vertical" size="large">
                <Title level={1} style={{ 
                  color: COLORS.text,
                  fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                  lineHeight: 1.2,
                  marginBottom: 0
                }}>
                  Transform your space with{' '}
                  <span style={{ color: COLORS.action }}>Lumiere</span>
                </Title>
                <Text style={{ 
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', 
                  color: `${COLORS.text}90`,
                  lineHeight: 1.6,
                  display: 'block'
                }}>
                  Your personalized interior design assistant
                </Text>
                
                <Paragraph style={{ 
                  fontSize: 'clamp(1rem, 2vw, 1.125rem)', 
                  color: `${COLORS.text}70`,
                  lineHeight: 1.6
                }}>
                  Create stunning interior designs with AI-powered tools. 
                  Visualize, plan, and execute your dream space effortlessly.
                </Paragraph>

                <Space wrap style={{ marginTop: '32px' }}>
                  <Button 
                    type="primary" 
                    size="large"
                    style={{
                      background: COLORS.action,
                      borderColor: COLORS.action,
                      height: '48px',
                      padding: '0 32px',
                      fontSize: '1rem',
                      fontWeight: 500
                    }}
                    onClick={() => navigate('/canvas')}
                  >
                    Get Started <ArrowRightOutlined />
                  </Button>
                  <Button 
                    size="large"
                    style={{
                      background: 'transparent',
                      borderColor: COLORS.action,
                      color: COLORS.action,
                      height: '48px',
                      padding: '0 32px'
                    }}
                    ghost
                  >
                    Explore Designs
                  </Button>
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={12}>
              <Carousel 
                autoplay 
                dotPosition="bottom"
                style={{ 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}
              >
                {heroImages.map((image, index) => (
                  <div key={index}>
                    <div style={{
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.action}30`,
                      borderRadius: '12px',
                      padding: '32px',
                      height: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '200px',
                        background: `linear-gradient(135deg, ${COLORS.action}20, ${COLORS.background})`,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}>
                        <EyeOutlined style={{ 
                          fontSize: '48px', 
                          color: COLORS.action,
                          opacity: 0.5 
                        }} />
                      </div>
                      <Title level={4} style={{ 
                        color: COLORS.text,
                        marginBottom: '8px'
                      }}>
                        {image.title}
                      </Title>
                      <Text style={{ color: `${COLORS.text}70` }}>
                        {image.description}
                      </Text>
                    </div>
                  </div>
                ))}
              </Carousel>
            </Col>
          </Row>
        </section>

        {/* Features Section */}
        <section style={{ padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <Title level={2} style={{ 
              color: COLORS.text,
              marginBottom: '16px'
            }}>
              What Lumiere Does
            </Title>
            <Text style={{ 
              color: `${COLORS.text}70`,
              fontSize: '1.125rem',
              maxWidth: '600px',
              margin: '0 auto',
              display: 'block'
            }}>
              Powerful tools to bring your design vision to life
            </Text>
          </div>

          <Row gutter={[32, 32]} justify="center">
            {features.map((feature, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Card 
                  hoverable
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.action}30`,
                    borderRadius: '12px',
                    height: '100%',
                    transition: 'transform 0.3s ease'
                  }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <Space direction="vertical" size="middle" align="center">
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: `${feature.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        color: feature.color,
                        fontSize: '24px'
                      }}>
                        {feature.icon}
                      </div>
                    </div>
                    <Title level={4} style={{ 
                      color: COLORS.text,
                      textAlign: 'center',
                      margin: 0
                    }}>
                      {feature.title}
                    </Title>
                    <Text style={{ 
                      color: `${COLORS.text}70`,
                      textAlign: 'center',
                      fontSize: '0.875rem'
                    }}>
                      {feature.description}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        {/* How It Works Section */}
        <section style={{ 
          padding: '80px 24px',
          background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`
        }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <Title level={2} style={{ 
              color: COLORS.text,
              marginBottom: '16px'
            }}>
              How It Works
            </Title>
            <Text style={{ 
              color: `${COLORS.text}70`,
              fontSize: '1.125rem',
              maxWidth: '600px',
              margin: '0 auto',
              display: 'block'
            }}>
              Simple steps to create your perfect space
            </Text>
          </div>

          <Row justify="center">
            <Col xs={24} md={20} lg={16}>
              <Steps 
                current={activeStep}
                onChange={setActiveStep}
                responsive={false}
                direction="horizontal"
                style={{ marginBottom: '48px' }}
              >
                {howItWorksSteps.map((step, index) => (
                  <Step 
                    key={index}
                    title={
                      <Text style={{ 
                        color: COLORS.text,
                        fontSize: 'clamp(0.875rem, 2vw, 1rem)'
                      }}>
                        {step.title}
                      </Text>
                    }
                    description={
                      <Text style={{ 
                        color: `${COLORS.text}70`,
                        fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)'
                      }}>
                        {step.description}
                      </Text>
                    }
                    icon={
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: index === activeStep ? COLORS.action : `${COLORS.action}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: index === activeStep ? COLORS.background : COLORS.action
                      }}>
                        {index + 1}
                      </div>
                    }
                  />
                ))}
              </Steps>
            </Col>
          </Row>
        </section>

        {/* Signup Section */}
        <section id="signup-section" style={{ padding: '80px 24px' }}>
          <Row gutter={[48, 48]} justify="center">
            <Col xs={24} md={12} lg={10}>
              <Card 
                style={{ 
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.action}30`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
                bodyStyle={{ padding: '32px 24px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <Title level={2} style={{ 
                    margin: 0, 
                    color: COLORS.text 
                  }}>
                    Start Your Design Journey
                  </Title>
                  <Text style={{ 
                    color: `${COLORS.text}70`,
                    fontSize: '0.875rem'
                  }}>
                    Create your free account in seconds
                  </Text>
                </div>
                
                <Form
                  form={form}
                  name="signup"
                  onFinish={onFinish}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="name"
                    rules={[
                      { required: true, message: 'Please input your name!' },
                      { min: 2, message: 'Name must be at least 2 characters' }
                    ]}
                  >
                    <Input 
                      prefix={<UserOutlined style={{ color: `${COLORS.action}` }} />} 
                      placeholder="Full Name"
                      style={{
                        background: `${COLORS.background}80`,
                        borderColor: `${COLORS.action}40`,
                        color: COLORS.text
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined style={{ color: `${COLORS.action}90` }} />} 
                      placeholder="Email Address"
                      style={{
                        background: `${COLORS.background}80`,
                        borderColor: `${COLORS.action}40`,
                        color: COLORS.text
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Please input your password!' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined style={{ color: `${COLORS.action}90` }} />} 
                      placeholder="Password"
                      style={{
                        background: `${COLORS.background}80`,
                        borderColor: `${COLORS.action}40`,
                        color: COLORS.text
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password!' },
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
                    <Input.Password 
                      prefix={<LockOutlined style={{ color: `${COLORS.action}90` }} />} 
                      placeholder="Confirm Password"
                      style={{
                        background: `${COLORS.background}80`,
                        borderColor: `${COLORS.action}40`,
                        color: COLORS.text
                      }}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginTop: '32px' }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      block
                      size="large"
                      style={{
                        background: COLORS.action,
                        borderColor: COLORS.action,
                        height: '48px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Create Free Account
                    </Button>
                  </Form.Item>

                  <Divider style={{ 
                    borderColor: `${COLORS.action}30`,
                    color: `${COLORS.text}50`,
                    fontSize: '0.875rem'
                  }}>
                    By signing up, you agree to our Terms & Privacy
                  </Divider>

                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ 
                      color: `${COLORS.text}70`,
                      fontSize: '0.875rem'
                    }}>
                      Already have an account?{' '}
                      <Button 
                        type="link" 
                        style={{ 
                          padding: '0 4px',
                          color: COLORS.action,
                          fontWeight: 500
                        }}
                      >
                        Log in here
                      </Button>
                    </Text>
                  </div>
                </Form>
              </Card>
            </Col>
          </Row>
        </section>
      </Content>

      {/* Footer */}
      <Footer style={{ 
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.action}20`,
        padding: '48px 24px'
      }}>
        <Row gutter={[48, 48]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" size="middle">
              <Title level={4} style={{ 
                color: COLORS.action,
                marginBottom: 0
              }}>
                Lumiere
              </Title>
              <Text style={{ color: `${COLORS.text}70` }}>
                Your personalized interior design assistant
              </Text>
              <Space size="middle">
                <FacebookOutlined style={{ color: COLORS.action, fontSize: '20px' }} />
                <TwitterOutlined style={{ color: COLORS.action, fontSize: '20px' }} />
                <InstagramOutlined style={{ color: COLORS.action, fontSize: '20px' }} />
                <YoutubeOutlined style={{ color: COLORS.action, fontSize: '20px' }} />
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space direction="vertical" size="small">
              <Text strong style={{ color: COLORS.text, marginBottom: '10px' }}>
                Quick Links
              </Text>
              <Button type="link" style={{ color: `${COLORS.text}70`, padding: 0 }}>
                Signup
              </Button>
              <Button type="link" style={{ color: `${COLORS.text}70`, padding: 0 }}>
                Login
              </Button>
              <Button type="link" style={{ color: `${COLORS.text}70`, padding: 0 }}>
                About
              </Button>
              <Button type="link" style={{ color: `${COLORS.text}70`, padding: 0 }}>
                Contact
              </Button>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space direction="vertical" size="small">
              <Text strong style={{ color: COLORS.text, marginBottom: '8px' }}>
                Newsletter
              </Text>
              <Text style={{ color: `${COLORS.text}70`, fontSize: '0.875rem' }}>
                Stay updated with design tips and new features
              </Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input 
                  placeholder="Your email"
                  style={{
                    background: `${COLORS.background}80`,
                    borderColor: `${COLORS.action}40`,
                    color: COLORS.text
                  }}
                />
                <Button 
                  type="primary"
                  style={{
                    background: COLORS.action,
                    borderColor: COLORS.action
                  }}
                >
                  Subscribe
                </Button>
              </Space.Compact>
            </Space>
          </Col>
        </Row>

        <Divider style={{ 
          borderColor: `${COLORS.action}30`,
          margin: '32px 0'
        }} />

        <Row justify="space-between" align="middle">
          <Col>
            <Text style={{ color: `${COLORS.text}60` }}>
              © {new Date().getFullYear()} Lumiere. All rights reserved.
            </Text>
          </Col>
          <Col>
            <Space>
              <Button type="link" style={{ color: `${COLORS.text}60`, padding: 0 }}>
                Privacy Policy
              </Button>
              <Button type="link" style={{ color: `${COLORS.text}60`, padding: 0 }}>
                Terms of Service
              </Button>
            </Space>
          </Col>
        </Row>
      </Footer>
    </Layout>
  );
};

export default LandingPage;