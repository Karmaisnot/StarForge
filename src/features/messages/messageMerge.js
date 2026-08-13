export function mergeTranscript(transcript, localMessages) {
  const confirmedIds = new Set(transcript.map((message) => String(message.id)));
  return [
    ...transcript,
    ...localMessages.filter((message) => !confirmedIds.has(String(message.id))),
  ];
}
