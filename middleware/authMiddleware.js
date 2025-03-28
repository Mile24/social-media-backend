import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // ✅ Extract token from request header
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access Denied! No token provided." });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id; // Attach user ID to request object

    next(); // Proceed to the next middleware/controller
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token!" });
  }
};

export default authMiddleware;
