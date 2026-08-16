import { createRootRoute, createRoute, createRouter, redirect, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/routes/HomePage";

const MarkdownToPdfPage = lazy(() =>
  import("@/routes/MarkdownToPdfPage").then((module) => ({
    default: module.MarkdownToPdfPage,
  })),
);
const PdfToolkitPage = lazy(() =>
  import("@/routes/PdfToolkitPage").then((module) => ({
    default: module.PdfToolkitPage,
  })),
);
const DownloaderPage = lazy(() =>
  import("@/routes/DownloaderPage").then((module) => ({
    default: module.DownloaderPage,
  })),
);
const ImageConverterIndex = lazy(() =>
  import("@/routes/ImageConverterPage").then((module) => ({
    default: module.ImageConverterIndex,
  })),
);
const ToJpegPage = lazy(() =>
  import("@/routes/ImageConverterPage").then((module) => ({ default: module.ToJpegPage })),
);
const ToPngPage = lazy(() =>
  import("@/routes/ImageConverterPage").then((module) => ({ default: module.ToPngPage })),
);
const ToWebpPage = lazy(() =>
  import("@/routes/ImageConverterPage").then((module) => ({ default: module.ToWebpPage })),
);
const ToIcoPage = lazy(() =>
  import("@/routes/ImageConverterPage").then((module) => ({ default: module.ToIcoPage })),
);
const JsonBeautifierPage = lazy(() =>
  import("@/routes/JsonBeautifierPage").then((module) => ({
    default: module.JsonBeautifierPage,
  })),
);
const JsonToToonPage = lazy(() =>
  import("@/routes/JsonToToonPage").then((module) => ({
    default: module.JsonToToonPage,
  })),
);
const JsonComparePage = lazy(() =>
  import("@/routes/JsonComparePage").then((module) => ({
    default: module.JsonComparePage,
  })),
);
const PromptImproverPage = lazy(() =>
  import("@/routes/PromptImproverPage").then((module) => ({
    default: module.PromptImproverPage,
  })),
);
const UrlEncoderDecoderPage = lazy(() =>
  import("@/routes/UrlEncoderDecoderPage").then((module) => ({
    default: module.UrlEncoderDecoderPage,
  })),
);
const UrlShortenerPage = lazy(() =>
  import("@/routes/UrlShortenerPage").then((module) => ({
    default: module.UrlShortenerPage,
  })),
);
const JwtDecodePage = lazy(() =>
  import("@/routes/JwtDecodePage").then((module) => ({
    default: module.JwtDecodePage,
  })),
);
const UuidGeneratorPage = lazy(() =>
  import("@/routes/UuidGeneratorPage").then((module) => ({
    default: module.UuidGeneratorPage,
  })),
);
const PasswordGeneratorPage = lazy(() =>
  import("@/routes/PasswordGeneratorPage").then((module) => ({
    default: module.PasswordGeneratorPage,
  })),
);
const Base64Page = lazy(() =>
  import("@/routes/Base64Page").then((module) => ({
    default: module.Base64Page,
  })),
);
const RegexTesterPage = lazy(() =>
  import("@/routes/RegexTesterPage").then((module) => ({
    default: module.RegexTesterPage,
  })),
);
const TimestampConverterPage = lazy(() =>
  import("@/routes/TimestampConverterPage").then((module) => ({
    default: module.TimestampConverterPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <section className="py-8">
      <p className="text-base text-muted-foreground text-center">Loading tool...</p>
    </section>
  );
}

function withLazySuspense(PageComponent: ComponentType) {
  return function LazyRouteComponent() {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <PageComponent />
      </Suspense>
    );
  };
}

function NotFoundPage() {
  return (
    <section className="space-y-3 py-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">Use the navigation to return to one of the tools.</p>
    </section>
  );
}

const rootRoute = createRootRoute({
  component: AppLayout,
  notFoundComponent: NotFoundPage
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage
});

const markdownToPdfRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/markdown-to-pdf",
  component: withLazySuspense(MarkdownToPdfPage)
});

// Audioscribe was renamed to Markdown to PDF. Published short links still point
// at the old path, so keep redirecting them with ?md= and ?via= intact.
const legacyAudioscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audioscribe",
  beforeLoad: () => {
    throw redirect({
      to: "/markdown-to-pdf",
      search: (prev: Record<string, unknown>) => prev,
      replace: true
    });
  }
});

const pdfToolkitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pdf-toolkit",
  component: withLazySuspense(PdfToolkitPage)
});

const downloaderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/downloader",
  component: withLazySuspense(DownloaderPage)
});

// The four children are declared explicitly rather than generated from a
// config array: TanStack infers <Link to=""> types from statically declared
// routes, and a .map() widens them to string.
const imageConverterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/image-converter",
  component: Outlet
});

const imageConverterIndexRoute = createRoute({
  getParentRoute: () => imageConverterRoute,
  path: "/",
  component: withLazySuspense(ImageConverterIndex)
});

const imageToJpegRoute = createRoute({
  getParentRoute: () => imageConverterRoute,
  path: "to-jpeg",
  component: withLazySuspense(ToJpegPage)
});

const imageToPngRoute = createRoute({
  getParentRoute: () => imageConverterRoute,
  path: "to-png",
  component: withLazySuspense(ToPngPage)
});

const imageToWebpRoute = createRoute({
  getParentRoute: () => imageConverterRoute,
  path: "to-webp",
  component: withLazySuspense(ToWebpPage)
});

const imageToIcoRoute = createRoute({
  getParentRoute: () => imageConverterRoute,
  path: "to-ico",
  component: withLazySuspense(ToIcoPage)
});

const jsonBeautifierRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/json-beautifier",
  component: withLazySuspense(JsonBeautifierPage)
});

const jsonToToonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/json-to-toon",
  component: withLazySuspense(JsonToToonPage)
});

const jsonCompareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/json-compare",
  component: withLazySuspense(JsonComparePage)
});

const promptImproverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/prompt-improver",
  component: withLazySuspense(PromptImproverPage)
});

const urlEncoderDecoderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/url-encoder-decoder",
  component: withLazySuspense(UrlEncoderDecoderPage)
});

const urlShortenerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/url-shortener",
  component: withLazySuspense(UrlShortenerPage)
});

const jwtDecodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jwt-decode",
  component: withLazySuspense(JwtDecodePage)
});

const uuidGeneratorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/uuid-generator",
  component: withLazySuspense(UuidGeneratorPage)
});

const passwordGeneratorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/password-generator",
  component: withLazySuspense(PasswordGeneratorPage)
});

const base64Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/base64",
  component: withLazySuspense(Base64Page)
});

const regexTesterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/regex-tester",
  component: withLazySuspense(RegexTesterPage)
});

const timestampConverterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/timestamp-converter",
  component: withLazySuspense(TimestampConverterPage)
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  markdownToPdfRoute,
  pdfToolkitRoute,
  downloaderRoute,
  imageConverterRoute.addChildren([
    imageConverterIndexRoute,
    imageToJpegRoute,
    imageToPngRoute,
    imageToWebpRoute,
    imageToIcoRoute
  ]),
  legacyAudioscribeRoute,
  jsonBeautifierRoute,
  jsonToToonRoute,
  jsonCompareRoute,
  promptImproverRoute,
  urlEncoderDecoderRoute,
  urlShortenerRoute,
  jwtDecodeRoute,
  uuidGeneratorRoute,
  passwordGeneratorRoute,
  base64Route,
  regexTesterRoute,
  timestampConverterRoute
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent"
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
