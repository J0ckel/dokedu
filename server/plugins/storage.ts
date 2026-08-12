import s3Driver from "unstorage/drivers/s3"
import fsDriver from "unstorage/drivers/fs"

export default defineNitroPlugin(() => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  // Use filesystem storage if S3 is not configured
  const hasS3Config = config.s3Endpoint && config.s3AccessKeyId && config.s3SecretAccessKey && config.s3Bucket

  if (process.dev || !hasS3Config) {
    storage.mount(
      "files",
      fsDriver({
        base: "./storage/files"
      })
    )
    return
  }

  const driver = s3Driver({
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
    endpoint: config.s3Endpoint,
    bucket: config.s3Bucket,
    region: config.s3Region
  })

  storage.mount("files", driver)
})
