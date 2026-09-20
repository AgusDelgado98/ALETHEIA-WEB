import Head from "next/head";
import ArticleBody from "../components/ArticleBody";

export const config = { unstable_runtimeJS: false };

export default function Page() {
  return (
    <>
      <Head><title>ALETHEIA — spike</title></Head>
      <ArticleBody />
    </>
  );
}
