{pkgs}: {
  deps = [
    pkgs.alsaLib
    pkgs.libxkbcommon
    pkgs.xorg.libxcb
    pkgs.mesa
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.cairo
    pkgs.cups
    pkgs.pango
    pkgs.dbus
    pkgs.atk
    pkgs.nspr
    pkgs.nss
    pkgs.freetype
    pkgs.libpng
    pkgs.xorg.libXScrnSaver
    pkgs.xorg.libX11
    pkgs.gtk3
    pkgs.glib
  ];
}
