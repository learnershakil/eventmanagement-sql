import { Redis } from "ioredis";

const redisClient = new Redis({
  port: 12977,
  host: "redis-12977.c264.ap-south-1-1.ec2.redns.redis-cloud.com",
  username: "default",
  password: "45nRcYgME3lchFtQ1bq8kVhjWniT3IvH",
  db: 0,
});

export const redisDeleteKeysByPattern = async (pattern) => {
  let cursor = "0";
  do {
    const [newCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    cursor = newCursor;
  } while (cursor !== "0");
};

// // Usage
// redisDeleteKeysByPattern("filterProducts*")
//   .then(() => {
//     console.log("Keys deleted successfully");
//   })
//   .catch((error) => {
//     console.error("Error deleting keys:", error);
//   });

export default redisClient;
