const invalidateRecommendationCache = async (redisClient, userId) => {
  if (!redisClient) return

  const pattern = `recommend:${userId}:*`
  let cursor = 0

  do {
    const reply = await redisClient.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    })

    cursor = Number(reply.cursor)

    if (Array.isArray(reply.keys) && reply.keys.length > 0) {
      await redisClient.del(reply.keys)
    }
  } while (cursor !== 0)
}

module.exports = {
  invalidateRecommendationCache,
}
