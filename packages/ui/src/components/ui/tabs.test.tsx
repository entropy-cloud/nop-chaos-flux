import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
  it('renders vertical tabs with orientation-aware list and trigger classes', () => {
    const markup = renderToStaticMarkup(
      <Tabs orientation="vertical" value="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Body</TabsContent>
      </Tabs>,
    );

    expect(markup).toContain('data-orientation="vertical"');
    expect(markup).toContain('group-data-[orientation=vertical]/tabs:flex-col');
    expect(markup).toContain('group-data-[orientation=vertical]/tabs:w-full');
    expect(markup).toContain('group-data-[orientation=vertical]/tabs:justify-start');
  });
});
