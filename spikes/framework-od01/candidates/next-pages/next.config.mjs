/** @type {import('next').NextConfig} */
// ignoreBuildErrors: unstable_runtimeJS is rejected by the generated PagesPageConfig type (measurement-only variant).
export default { output: "export", images: { unoptimized: true }, typescript: { ignoreBuildErrors: true } };
