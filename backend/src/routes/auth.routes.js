const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { users } = require("../data/mockStore");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, businessName } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ error: { message: "email, password and businessName are required" } });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = users.find((user) => user.email === normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: { message: "User already exists" } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      email: normalizedEmail,
      businessName,
      passwordHash
    };

    users.push(newUser);

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        email: newUser.email,
        businessName: newUser.businessName
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: "email and password are required" } });
    }

    const normalizedEmail = email.toLowerCase();
    const user = users.find((item) => item.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, businessName: user.businessName },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
