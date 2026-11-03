<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @if(app()->environment('production'))
            @php
                $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
                $css = $manifest['resources/css/app.css']['file'] ?? null;
                $appJs = $manifest['resources/js/app.tsx']['file'] ?? null;
                $pageFile = $manifest["resources/js/pages/{$page['component']}.tsx"]['file'] ?? null;

                $fontsManifest = public_path('build/fonts-manifest.json');
                $fontsCss = is_file($fontsManifest)
                    ? (json_decode(file_get_contents($fontsManifest), true)['style']['file'] ?? null)
                    : null;
            @endphp
            @if($css)<link rel="stylesheet" href="{{ asset("build/{$css}") }}">@endif
            @if($fontsCss)<link rel="stylesheet" href="{{ asset("build/{$fontsCss}") }}">@endif
            @if($appJs)<script type="module" src="{{ asset("build/{$appJs}") }}"></script>@endif
            @if($pageFile)<script type="module" src="{{ asset("build/{$pageFile}") }}"></script>@endif
        @else
            @fonts
            @viteReactRefresh
            @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @endif
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
