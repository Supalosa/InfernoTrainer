import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://192.168.1.157:4317';
const traceExporter = new OTLPTraceExporter({ url: otlpEndpoint });
const metricExporter = new OTLPMetricExporter({ url: otlpEndpoint });
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 30000,
});

export const sdk = new NodeSDK({
  traceExporter,
  metricReader,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'InfernoTrainer',
});

async function init() {
  try {
    await sdk.start();
    console.log('OpenTelemetry SDK initialized');
  } catch (error) {
    console.error('Error initializing OpenTelemetry SDK', error);
  }
}
init().catch(console.error);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK terminated'))
    .catch((error) => console.error('Error terminating SDK', error))
    .finally(() => process.exit(0));
});
