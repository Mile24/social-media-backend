import express from "express";
import multer from "multer";
import fs from "fs";
import Post from "../models/Post.js";
import mongoose from "mongoose";

const router = express.Router();

// ✅ Ensure 'uploads' directory exists
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// 🟢 Create a New Post (with Image Upload)

// 🟢 Create a New Post (with Image Upload or URL)
router.post("/create", upload.single("image"), async (req, res) => {
    try {
      console.log("File Upload Debug:", req.file);
      console.log("Request Body:", req.body);
  
      const { userId, caption, imageUrl } = req.body;
  
      if (!userId || !caption) {
        return res.status(400).json({ message: "User ID and caption are required." });
      }
  
      // ✅ Fix: Check if user uploaded an image or provided an image URL
      let image = imageUrl; // Default to the provided URL
      if (req.file) {
        image = `/uploads/${req.file.filename}`; // Use uploaded file if exists
      }
  
      console.log("Final Image URL:", image);
  
      const newPost = new Post({
        userId,
        caption,
        image
      });
  
      await newPost.save();
      res.status(201).json({ message: "Post created successfully", post: newPost });
  
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  


// 🔵 Get All Posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username email");
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});




  // ❤️ Like & Unlike a Post (With Like Count)



  router.put("/like/:postId", async (req, res) => {
    try {
      const { userId } = req.body; // Get userId from request body
      const post = await Post.findById(req.params.postId);
  
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
  
      console.log("Before Like Update:", post.likes, "Like Count:", post.likeCount);
  
      if (post.likes.has(userId)) {
        console.log(`User ${userId} is unliking the post`);
        post.likes.delete(userId); // Remove like
        post.likeCount = Math.max(0, post.likeCount - 1); // Ensure count doesn't go negative
      } else {
        console.log(`User ${userId} is liking the post`);
        post.likes.set(userId, true); // Add like
        post.likeCount += 1;
      }
  
      // ✅ Ensure the update is saved in the database
      await post.markModified("likes"); // Inform Mongoose that `likes` has changed
      await post.save();
  
      console.log("After Like Update:", post.likes, "Updated Like Count:", post.likeCount);
  
      res.status(200).json({ message: "Like updated", post });
    } catch (error) {
      console.error("Error updating like:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  
  

// 💬 Add a Comment
router.post("/comment/:postId", async (req, res) => {
  try {
    const { userId, text } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ userId, text });
    await post.save();

    res.status(200).json({ message: "Comment added", post });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑️ Delete a Post
router.delete("/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    await post.deleteOne();
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
