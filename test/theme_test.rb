# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"

class ThemeTest < Minitest::Test
  MONOCHROME_TOKENS = %w[
    bg-color text-color heading-color link-color border-color code-bg
    code-color shadow-color tint-color
  ].freeze

  def self.output_directory
    @output_directory ||= Dir.mktmpdir("jekyll-theme-test")
  end

  def self.build_site
    stdout, stderr, status = Open3.capture3(
      "bundle", "exec", "jekyll", "build", "--destination", output_directory
    )
    raise "Jekyll build failed:\n#{stdout}\n#{stderr}" unless status.success?
  end

  build_site
  Minitest.after_run { FileUtils.remove_entry(output_directory) }

  def setup
    @css = File.read(File.join(self.class.output_directory, "assets/main.css"))
  end

  def declaration_blocks(selector)
    selector_pattern = selector.split(",").map do |part|
      part.strip.split(/\s+/).map { |token| Regexp.escape(token) }.join("\\s+")
    end.join("\\s*,\\s*")
    @css.scan(/#{selector_pattern}\s*\{\s*([^}]+?)\s*\}/).flatten
  end

  def declaration_block(selector)
    blocks = declaration_blocks(selector)
    refute_empty blocks, "Expected rendered CSS to contain #{selector}"
    # The last matching rule is the one that wins when specificity is equal.
    blocks.last
  end

  def property_value(block, property)
    match = block.match(/(?:^|;)\s*#{Regexp.escape(property)}\s*:\s*([^;]+)/)
    refute_nil match, "Expected #{property} in declaration block"
    match[1].strip
  end

  def custom_property(block, property)
    property_value(block, "--#{property}")
  end

  def test_light_theme_uses_soft_neutral_contrast
    root = declaration_block(":root")
    expected = {
      "bg-color" => "#fff",
      "text-color" => "#404040",
      "heading-color" => "#262626",
      "link-color" => "#333",
      "border-color" => "#dedede",
      "code-bg" => "#f5f5f5",
      "code-color" => "#404040",
      "shadow-color" => "rgba(0, 0, 0, 0.12)",
      "tint-color" => "#707070"
    }

    expected.each do |token, color|
      assert_equal color, custom_property(root, token), token
    end
  end

  def test_dark_theme_uses_soft_neutral_contrast
    dark = declaration_block("[data-theme=dark]")
    expected = {
      "bg-color" => "#181818",
      "text-color" => "#d0d0d0",
      "heading-color" => "#ededed",
      "link-color" => "#dedede",
      "border-color" => "#383838",
      "code-bg" => "#202020",
      "code-color" => "#d0d0d0",
      "shadow-color" => "#000",
      "tint-color" => "#a8a8a8"
    }

    expected.each do |token, color|
      assert_equal color, custom_property(dark, token), token
    end
  end

  def test_page_uses_theme_colors
    page = declaration_block("html, body")

    assert_equal "var(--bg-color)", property_value(page, "background-color")
    assert_equal "var(--text-color)", property_value(page, "color")
  end

  def test_code_uses_theme_colors
    code = declaration_block("code, pre, .highlight, .highlighter-rouge")

    assert_equal "var(--code-bg) !important", property_value(code, "background-color")
    assert_equal "var(--code-color) !important", property_value(code, "color")
  end

  def test_highlighted_syntax_inherits_code_color
    highlighted_tokens = declaration_block(".highlight *")

    assert_equal "var(--code-color) !important", property_value(highlighted_tokens, "color")
  end

  def test_dark_code_surfaces_have_a_theme_aware_border
    surfaces = declaration_block(
      "[data-theme=dark] pre, [data-theme=dark] .highlight, " \
      "[data-theme=dark] .highlighter-rouge"
    )

    assert_equal "1px solid var(--border-color)", property_value(surfaces, "border")
  end

  def test_home_page_posts_do_not_have_dividing_lines
    catalogue_item = declaration_block(".catalogue-item")

    assert_equal "none", property_value(catalogue_item, "border-bottom")
  end

  def test_navigation_does_not_have_a_dividing_line
    navigation = declaration_block(".nav")

    assert_equal "none", property_value(navigation, "box-shadow")
  end

  def test_post_header_line_is_hidden
    post_line = declaration_block(".post-line")

    assert_equal "none", property_value(post_line, "display")
  end

  def test_navigation_places_social_links_after_site_title
    home = File.read(File.join(self.class.output_directory, "index.html"))
    navigation = home.match(/<nav class="nav">(.+?)<\/nav>/m)
    refute_nil navigation, "Expected rendered home page to contain navigation"

    title_position = navigation[1].index("Nimisha GJ")
    github_position = navigation[1].index('href="https://github.com/nimishgj"')
    linkedin_position = navigation[1].index('href="https://www.linkedin.com/in/nimishgj/"')

    refute_nil github_position, "Expected navigation to contain the GitHub link"
    refute_nil linkedin_position, "Expected navigation to contain the LinkedIn link"
    assert_operator github_position, :>, title_position
    assert_operator linkedin_position, :>, github_position
  end

  def test_navigation_links_remain_beside_site_title
    container = declaration_block(".nav-container")
    links = declaration_block(".nav ul")

    assert_equal "flex-start", property_value(container, "justify-content")
    assert_equal "static", property_value(links, "position")
    assert_equal "flex", property_value(links, "display")
    assert_equal "16px", property_value(links, "gap")
  end

  def test_typography_matches_reference_blog
    html = declaration_block("html")
    body = declaration_block("body")

    assert_equal "16px", property_value(html, "font-size")
    font_family = property_value(body, "font-family").gsub(/\s*,\s*/, ",")
    assert_equal '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
                 font_family
    assert_equal "16px", property_value(body, "font-size")
    assert_equal "1.6", property_value(body, "line-height")
    assert_equal "400", property_value(body, "font-weight")
  end

  def test_reading_column_matches_reference_width
    container = declaration_block(".container")

    assert_equal "832px", property_value(container, "max-width")
    assert_equal "100%", property_value(container, "width")
    assert_equal "0 20px", property_value(container, "padding")
  end

  def test_post_copy_matches_reference_spacing
    copy = declaration_block(".post p")
    reading_lines = declaration_block(".post p, .post li")

    assert_equal "left", property_value(copy, "text-align")
    assert_equal "0 0 1rem", property_value(copy, "margin")
    assert_equal "1.6", property_value(reading_lines, "line-height")
  end

  def test_post_headings_match_reference_scale
    title = declaration_block(".post-title")
    section_headings = declaration_block(".post h2, .post h3")

    assert_equal "2em", property_value(title, "font-size")
    assert_equal "700", property_value(title, "font-weight")
    assert_equal "left", property_value(title, "text-align")
    assert_equal "4px", property_value(title, "margin-bottom")
    assert_equal "700", property_value(section_headings, "font-weight")
    assert_equal "32px", property_value(section_headings, "margin-top")
  end

  def test_post_metadata_matches_reference_styling
    metadata = declaration_block(".post-info")

    assert_equal "inherit", property_value(metadata, "font-family")
    assert_equal "14px", property_value(metadata, "font-size")
    assert_equal "left", property_value(metadata, "text-align")
  end

  def test_code_matches_reference_scale_and_spacing
    code = declaration_block("code")
    pre = declaration_block("pre")

    assert_equal "14px", property_value(code, "font-size")
    assert_equal "14px", property_value(pre, "font-size")
    assert_equal "16px", property_value(pre, "padding")
  end
end
