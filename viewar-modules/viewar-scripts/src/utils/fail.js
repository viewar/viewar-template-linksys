export default function fail(error) {
  if (!(error instanceof Error)) {
    throw new Error(error);
  } else {
    throw error;
  }
}
