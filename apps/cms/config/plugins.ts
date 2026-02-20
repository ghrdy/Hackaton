export default ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('R2_ACCESS_KEY_ID'),
            secretAccessKey: env('R2_ACCESS_SECRET'),
          },
          endpoint: env('R2_ENDPOINT'),
          region: env('R2_REGION', 'auto'),
          params: {
            Bucket: env('R2_BUCKET'),
          },
        },
        // On le met ici aussi au cas où
        baseUrl: env('R2_PUBLIC_URL'),
      },
      // Et on le laisse ici
      baseUrl: env('R2_PUBLIC_URL'),
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
