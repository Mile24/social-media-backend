import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();


// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
      user: process.env.EMAIL_USER, // ✅ Your Gmail
      pass: process.env.EMAIL_PASS, // ✅ Your App Password (not your Gmail password)
  },
  debug: true, // Enable debugging
    logger: true,
     // Log SMTP requests
     secure: true,
});

// ✅ Forgot Password - Send Reset Link
router.post("/forgot-password", async (req, res) => {
  try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
          return res.status(404).json({ message: "User not found!" });
      }

      // Generate Reset Token
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour
      await user.save();

      // Send Reset Email
      const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Password Reset Request",
          text: `Click the following link to reset your password: ${resetLink}`,
      };

      await transporter.sendMail(mailOptions);

      res.json({ message: "Password reset link sent to your email." });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
  }
});

// ✅ Reset Password
router.post("/reset-password/:token", async (req, res) => {
  try {
      const { token } = req.params;
      const { newPassword } = req.body;

      const user = await User.findOne({
          resetToken: token,
          resetTokenExpiry: { $gt: Date.now() }, // Check if token is still valid
      });

      if (!user) {
          return res.status(400).json({ message: "Invalid or expired token!" });
      }

      // Hash New Password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      res.json({ message: "Password reset successful!" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
  }
});







// ✅ User Registration Route
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, profilePicture, visibility } = req.body;

        // ✅ Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists!" });
        }

        // ✅ Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ Create New User
        user = new User({
            name,
            email,
            password: hashedPassword,
            profilePicture,
            visibility,
        });

        await user.save();

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.status(201).json({ message: "User registered successfully!", user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ User Login Route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password!" });
        }

        // ✅ Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password!" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            message: "Login successful!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                visibility: user.visibility,
            },
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
