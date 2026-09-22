/* eslint-disable react/jsx-no-undef -- gate fixture: read as text by find-ui-consistency-gaps.test.ts, never executed */
export function OverlayClean() {
  return (
    <Dialog open>
      <DialogContent size="base" className="p-0 overflow-hidden flex flex-col">
        <Button className="w-[40px]" />
      </DialogContent>
      <SheetContent side="right" className="flex flex-col">
        <div className="max-w-[200px]">child widths are fine</div>
      </SheetContent>
      <DrawerContent size="sm" className="p-4">
        body
      </DrawerContent>
    </Dialog>
  );
}
