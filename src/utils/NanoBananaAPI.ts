// NanoBanana.ts
export interface GenerateImageOptions {
  type?: string;
  numImages?: number;
  callBackUrl?: string;
  watermark?: boolean;
  imageUrls?: string[];
}

interface APIResponse<T> {
  code: number;
  msg?: string;
  data?: T;
  successFlag?: number;
  errorMessage?: string;
  response?: GenerateImageResponse;
}

export interface GenerateImageResponse {
  resultImageUrl: string;
}

export class NanoBananaAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.nanobananaapi.ai/api/v1/nanobanana';
  }

  async generateImage(
    prompt: string,
    options: GenerateImageOptions = {}
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        type: options.type || 'IMG2IMG',
        numImages: options.numImages || 1,
        callBackUrl: options.callBackUrl,
        watermark: options.watermark,
        imageUrls: options.imageUrls,
      }),
    });

    const result: APIResponse<{ taskId: string }> = await response.json();
    if (!response.ok || result.code !== 200) {
      throw new Error(`Generation failed: ${result.msg || 'Unknown error'}`);
    }

    return result.data!.taskId;
  }

  async getTaskStatus(
    taskId: string
  ): Promise<APIResponse<GenerateImageResponse>> {
    const response = await fetch(
      `${this.baseUrl}/record-info?taskId=${taskId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    return await response.json();
  }

  async waitForCompletion(
    taskId: string,
    maxWaitTime: number = 300000
  ): Promise<GenerateImageResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTaskStatus(taskId);
      console.log(status);

      //@ts-ignore
      switch (status.data.successFlag) {
        case 0:
          console.log('Task in progress...');
          break;
        case 1:
          //@ts-ignore
          return status.data.response.resultImageUrl!;
        case 2:
        case 3:
          throw new Error(status.errorMessage || 'Generation failed');
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    throw new Error('Generation timeout');
  }
}
