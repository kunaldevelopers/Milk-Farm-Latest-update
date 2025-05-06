import React from "react";
import { Box, Container, Typography, Link } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: "auto",
        backgroundColor: "#4a5e6a", // --slate-gray
        color: "#f5f6f5", // --milk-white
        borderTop: "1px solid",
        borderColor: "#a8d5ba", // --pasture-green
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: "bold",
              letterSpacing: 0.5,
              color: "#ede4d7", // --creamy-beige
            }}
          >
            Milk Farm CRM
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#a8d5ba", // --pasture-green
              mb: 2,
            }}
          >
            Powered by EnegiX Global
          </Typography>
          <Typography variant="body2" sx={{ color: "#f5f6f5" }}>
            © {new Date().getFullYear()}{" "}
            <Link
              href="https://enegixwebsolutions.com/"
              sx={{
                color: "#6ab7d6", // --sky-blue
                textDecoration: "none",
                "&:hover": { textDecoration: "underline", color: "#f4a261" }, // --sunset-orange
              }}
            >
              EnegiX Global.
            </Link>{" "}
            All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
