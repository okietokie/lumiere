import { motion } from "framer-motion";
import { ArrowRightOutlined, LoginOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import LMLogoScene from "./landing/LMLogoScene";
import LandingSections from "./landing/LandingSections";
import "./landing/landing-page.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <LandingSections
        navActions={
          <>
            <motion.button
              className="lm-button lm-button-secondary"
              onClick={() => navigate("/login")}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.975, y: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              Login <LoginOutlined />
            </motion.button>
            <motion.button
              className="lm-button lm-button-primary"
              onClick={() => navigate("/register")}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.975, y: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              Sign Up <ArrowRightOutlined />
            </motion.button>
          </>
        }
        heroActions={
          <>
            <motion.button
              className="lm-button lm-button-primary"
              onClick={() => navigate("/register")}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.975, y: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              Get Started <ArrowRightOutlined />
            </motion.button>
            <motion.button
              className="lm-button lm-button-secondary"
              onClick={() => navigate("/user/room")}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.975, y: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              Explore 3D <PlayCircleOutlined />
            </motion.button>
          </>
        }
        finalCta={{
          title: "Your Space, Reimagined",
          body: "The landing experience stays fully 3D, and account creation still uses the existing signup flow from main.",
          primaryLabel: "Create Account",
          primaryAction: () => navigate("/register"),
          secondaryLabel: "Login",
          secondaryAction: () => navigate("/login"),
          tertiaryLabel: "Try 3D Demo",
          tertiaryAction: () => navigate("/user/room"),
        }}
        sceneComponent={LMLogoScene}
      />
    </div>
  );
}
