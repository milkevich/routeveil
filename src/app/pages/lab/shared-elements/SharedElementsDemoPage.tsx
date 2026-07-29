import {
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react'
import { ArrowLeft, ArrowUpRight, Loader } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  RouteveilLink,
  RouteveilSharedElement,
  useRouteveilNavigate,
} from '../../../../react-router'
import { Footer } from '../../../shared/UI/Footer'
import { PixelHeadingWord } from '../../../shared/UI'
import '../lab.css'
import './shared-elements.css'

const assetRoot = '/shared-elements-pinterest-mock'

const animatedCardIds = new Set([
  4,
  8,
  10,
  15,
  19,
  24,
  25,
  28,
  29,
  30,
  36,
  37,
  39,
  40,
])

function getCardAsset(id: number): string {
  const extension = animatedCardIds.has(id) ? 'gif' : 'jpg'

  return `${assetRoot}/${id}.${extension}`
}

function getAvatarAsset(id: number): string {
  const extension = id === 34 ? 'webp' : 'jpg'

  return `${assetRoot}/avatars/${id}.${extension}`
}

const posts = [
  {
    id: '1',
    title: 'Everyone Is Dead in Neon',
    image: getCardAsset(1),
    author: 'Nora Bloom',
    username: 'norabloom',
    avatar: getAvatarAsset(1),
  },
  {
    id: '2',
    title: 'Leopard Repetition',
    image: getCardAsset(2),
    author: 'Mina Kaye',
    username: 'minakaye',
    avatar: getAvatarAsset(2),
  },
  {
    id: '40',
    title: 'Artifact',
    image: getCardAsset(40),
    author: 'Leon Ash',
    username: 'leonash',
    avatar: getAvatarAsset(34),
  },
  {
    id: '3',
    title: '',
    image: getCardAsset(3),
    author: 'Theo Marsh',
    username: 'theomarsh',
    avatar: getAvatarAsset(3),
  },
  {
    id: '4',
    title: 'Stay for the Splash',
    image: getCardAsset(4),
    author: 'June Hollow',
    username: 'junehollow',
    avatar: getAvatarAsset(4),
  },
  {
    id: '5',
    title: '',
    image: getCardAsset(5),
    author: 'Sol Mercer',
    username: 'solmercer',
    avatar: getAvatarAsset(5),
  },
  {
    id: '36',
    title: '',
    image: getCardAsset(36),
    author: 'Nova King',
    username: 'novaking',
    avatar: getAvatarAsset(34),
  },
  {
    id: '6',
    title: 'Pink Script',
    image: getCardAsset(6),
    author: 'Kian Rook',
    username: 'kianrook',
    avatar: getAvatarAsset(6),
  },
  {
    id: '7',
    title: 'Cash in the Gallery',
    image: getCardAsset(7),
    author: 'Remy Vale',
    username: 'remyvale',
    avatar: getAvatarAsset(7),
  },
  {
    id: '8',
    title: '',
    image: getCardAsset(9),
    author: 'Ellis Rowe',
    username: 'ellisrowe',
    avatar: getAvatarAsset(8),
  },
  {
    id: '10',
    title: 'Pixel Memory',
    image: getCardAsset(10),
    author: 'Bea Knox',
    username: 'beaknox',
    avatar: getAvatarAsset(10),
  },
  {
    id: '9',
    title: '',
    image: getCardAsset(8),
    author: 'Mara Quinn',
    username: 'maraquinn',
    avatar: getAvatarAsset(34),
  },
  {
    id: '11',
    title: 'The Longest Nap',
    image: getCardAsset(11),
    author: 'Luca Grey',
    username: 'lucagrey',
    avatar: getAvatarAsset(11),
  },
  {
    id: '12',
    title: 'Gold Against Gold',
    image: getCardAsset(12),
    author: 'Gia Leone',
    username: 'gialeone',
    avatar: getAvatarAsset(12),
  },
  {
    id: '13',
    title: 'Young, Lit, Handsome',
    image: getCardAsset(13),
    author: 'Cora Vane',
    username: 'coravane',
    avatar: getAvatarAsset(13),
  },
  {
    id: '14',
    title: 'Pink Leather Study',
    image: getCardAsset(14),
    author: 'Inez Cole',
    username: 'inezcole',
    avatar: getAvatarAsset(14),
  },
  {
    id: '15',
    title: '',
    image: getCardAsset(15),
    author: 'Nia Hart',
    username: 'niahart',
    avatar: getAvatarAsset(15),
  },
  {
    id: '39',
    title: '',
    image: getCardAsset(39),
    author: 'Anya Cove',
    username: 'anyacove',
    avatar: getAvatarAsset(34),
  },
  {
    id: '16',
    title: 'Garden Shift',
    image: getCardAsset(16),
    author: 'Oren Pike',
    username: 'orenpike',
    avatar: getAvatarAsset(16),
  },
  {
    id: '17',
    title: 'After-Hours Lawn Club',
    image: getCardAsset(17),
    author: 'Alma Frost',
    username: 'almafrost',
    avatar: getAvatarAsset(17),
  },
  {
    id: '18',
    title: 'Three Horses and a Witness',
    image: getCardAsset(18),
    author: 'Felix Ward',
    username: 'felixward',
    avatar: getAvatarAsset(18),
  },
  {
    id: '20',
    title: 'Tutto Passa',
    image: getCardAsset(20),
    author: 'Hugo Lane',
    username: 'hugolane',
    avatar: getAvatarAsset(20),
  },
  {
    id: '30',
    title: 'Accordion in the Ruins',
    image: getCardAsset(30),
    author: 'Jude Cross',
    username: 'judecross',
    avatar: getAvatarAsset(30),
  },
  {
    id: '21',
    title: '',
    image: getCardAsset(21),
    author: 'Cleo Banks',
    username: 'cleobanks',
    avatar: getAvatarAsset(21),
  },
  {
    id: '22',
    title: 'Diamond Smile',
    image: getCardAsset(22),
    author: 'Milo Stone',
    username: 'milostone',
    avatar: getAvatarAsset(22),
  },
  {
    id: '23',
    title: '',
    image: getCardAsset(23),
    author: 'Esme Reed',
    username: 'esmereed',
    avatar: getAvatarAsset(23),
  },
  {
    id: '24',
    title: 'P@P',
    image: getCardAsset(24),
    author: 'Arlo Finch',
    username: 'arlofinch',
    avatar: getAvatarAsset(24),
  },
  {
    id: '25',
    title: '',
    image: getCardAsset(25),
    author: 'Lyra West',
    username: 'lyrawest',
    avatar: getAvatarAsset(25),
  },
  {
    id: '19',
    title: '',
    image: getCardAsset(19),
    author: 'Tessa Moon',
    username: 'tessamoon',
    avatar: getAvatarAsset(19),
  },
  {
    id: '26',
    title: '',
    image: getCardAsset(26),
    author: 'Otis Crane',
    username: 'otiscrane',
    avatar: getAvatarAsset(26),
  },
  {
    id: '27',
    title: '',
    image: getCardAsset(27),
    author: 'Iris North',
    username: 'irisnorth',
    avatar: getAvatarAsset(27),
  },
  {
    id: '29',
    title: 'Concrete',
    image: getCardAsset(28),
    author: 'Vera Snow',
    username: 'verasnow',
    avatar: getAvatarAsset(29),
  },
  {
    id: '31',
    title: '',
    image: getCardAsset(31),
    author: 'Eden Shaw',
    username: 'edenshaw',
    avatar: getAvatarAsset(31),
  },
  {
    id: '32',
    title: 'Lotus Prayer',
    image: getCardAsset(32),
    author: 'Nico Vale',
    username: 'nicovale',
    avatar: getAvatarAsset(32),
  },
  {
    id: '33',
    title: 'Lethal Blonde',
    image: getCardAsset(33),
    author: 'Zola Wynn',
    username: 'zolawynn',
    avatar: getAvatarAsset(33),
  },
  {
    id: '28',
    title: '',
    image: getCardAsset(29),
    author: 'Enzo Lake',
    username: 'enzolake',
    avatar: getAvatarAsset(28),
  },
  {
    id: '34',
    title: 'Queen B',
    image: getCardAsset(34),
    author: 'Ayla Rose',
    username: 'aylarose',
    avatar: getAvatarAsset(34),
  },
  {
    id: '35',
    title: 'Pink',
    image: getCardAsset(35),
    author: 'Rafi Dune',
    username: 'rafidune',
    avatar: getAvatarAsset(34),
  },
  {
    id: '37',
    title: '',
    image: getCardAsset(37),
    author: 'Elio Moss',
    username: 'eliomoss',
    avatar: getAvatarAsset(34),
  },
  {
    id: '38',
    title: 'White Light at Low Tide',
    image: getCardAsset(38),
    author: 'Sora Bell',
    username: 'sorabell',
    avatar: getAvatarAsset(34),
  },
] as const

type Post = typeof posts[number]

type ImageMetadata = {
  width: number
  height: number
}

const imageMetadataCache = new Map<string, ImageMetadata>()
const imagePreparationCache = new Map<string, Promise<ImageMetadata>>()

let galleryPreparationPromise: Promise<void> | null = null

function isAnimatedImage(src: string): boolean {
  return /\.gif(?:$|\?)/i.test(src)
}

function cacheImageMetadata(
  src: string,
  image: HTMLImageElement,
): ImageMetadata | undefined {
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return undefined
  }

  const metadata = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  }

  imageMetadataCache.set(src, metadata)

  if (typeof window !== 'undefined') {
    const absoluteUrl = new URL(src, window.location.href).href
    imageMetadataCache.set(absoluteUrl, metadata)
  }

  return metadata
}

function prepareImage(src: string): Promise<ImageMetadata> {
  const cachedMetadata = imageMetadataCache.get(src)

  if (cachedMetadata) {
    return Promise.resolve(cachedMetadata)
  }

  const cachedPreparation = imagePreparationCache.get(src)

  if (cachedPreparation) {
    return cachedPreparation
  }

  if (typeof Image === 'undefined') {
    return Promise.resolve({
      width: 1,
      height: 1,
    })
  }

  const preparation = new Promise<ImageMetadata>((resolve) => {
    const image = new Image()

    image.decoding = 'async'

    image.onload = async () => {
      const metadata = cacheImageMetadata(src, image) ?? {
        width: 1,
        height: 1,
      }

      if (
        !isAnimatedImage(src)
        && typeof image.decode === 'function'
      ) {
        await image.decode().catch(() => undefined)
      }

      resolve(metadata)
    }

    image.onerror = () => {
      const metadata = {
        width: 1,
        height: 1,
      }

      imageMetadataCache.set(src, metadata)
      resolve(metadata)
    }

    image.src = src
  })

  imagePreparationCache.set(src, preparation)

  return preparation
}

function prepareGalleryAssets(): Promise<void> {
  if (galleryPreparationPromise) {
    return galleryPreparationPromise
  }

  galleryPreparationPromise = Promise.all(
    posts.map((post) => prepareImage(post.image)),
  ).then(() => undefined)

  return galleryPreparationPromise
}

function useGalleryReadiness() {
  const initiallyLoadedIds = posts
    .filter((post) => imageMetadataCache.has(post.image))
    .map((post) => post.id)

  const loadedIdsRef = useRef(new Set(initiallyLoadedIds))

  const [metadata, setMetadata] = useState(
    () => new Map(imageMetadataCache),
  )

  const [ready, setReady] = useState(
    () => initiallyLoadedIds.length === posts.length,
  )

  const finishWhenReady = () => {
    if (
      loadedIdsRef.current.size !== posts.length
      || ready
    ) {
      return
    }

    setMetadata(new Map(imageMetadataCache))
    setReady(true)
  }

  const registerLoadedImage = (
    post: Post,
    image: HTMLImageElement,
  ) => {
    if (loadedIdsRef.current.has(post.id)) {
      return
    }

    const imageMetadata = cacheImageMetadata(
      post.image,
      image,
    )

    if (!imageMetadata) {
      return
    }

    loadedIdsRef.current.add(post.id)
    finishWhenReady()
  }

  const registerFailedImage = (post: Post) => {
    if (loadedIdsRef.current.has(post.id)) {
      return
    }

    imageMetadataCache.set(post.image, {
      width: 1,
      height: 1,
    })

    loadedIdsRef.current.add(post.id)
    finishWhenReady()
  }

  useEffect(() => {
    finishWhenReady()
  })

  return {
    metadata,
    ready,
    registerFailedImage,
    registerLoadedImage,
  }
}

function getPostImageAlt(post: Post): string {
  return post.title
    ? `${post.title} by ${post.author}`
    : `Untitled post ${post.id} by ${post.author}`
}

function GalleryPost({
  index,
  metadata,
  onImageError,
  onImageLoad,
  post,
  transition,
}: {
  index: number
  metadata: ImageMetadata | undefined
  onImageError: (post: Post) => void
  onImageLoad: (
    post: Post,
    image: HTMLImageElement,
  ) => void
  post: Post
  transition: string
}) {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current

    if (
      image?.complete
      && image.naturalWidth > 0
      && image.naturalHeight > 0
    ) {
      onImageLoad(post, image)
    }
  }, [onImageLoad, post])

  const prepareRelatedAssets = () => {
    void prepareImage(post.image)
    void prepareImage(post.avatar)
  }

  return (
    <RouteveilLink
      preload="viewport"
      aria-label={post.title
        ? `View ${post.title}`
        : `View untitled post ${post.id}`}
      className="shared-gallery__post"
      onFocus={prepareRelatedAssets}
      onPointerDown={prepareRelatedAssets}
      onPointerEnter={prepareRelatedAssets}
      preventScrollReset
      scrollToSharedElement={`${post.id}-image`}
      to={`/lab/shared-elements/detail?post=${post.id}`}
      transition={transition}
      sharedElements={`${post.id}-image`}
    >
      <RouteveilSharedElement name={`${post.id}-image`}>
        <img
          alt={getPostImageAlt(post)}
          className="shared-gallery__image"
          decoding="async"
          draggable={false}
          fetchPriority={index < 6 ? 'high' : 'auto'}
          height={metadata?.height}
          loading="eager"
          onError={() => onImageError(post)}
          onLoad={(event: SyntheticEvent<HTMLImageElement>) => {
            onImageLoad(post, event.currentTarget)
          }}
          ref={imageRef}
          src={post.image}
          width={metadata?.width}
        />
      </RouteveilSharedElement>

      <div className="shared-gallery__caption">
        {post.title
          ? (
            <h3 className="shared-gallery__title">
              {post.title}
            </h3>
          )
          : null}

        <ArrowUpRight
          aria-hidden="true"
          className="shared-gallery__arrow"
          strokeWidth={2}
        />
      </div>
    </RouteveilLink>
  )
}

function RouteA() {
  const transition = 'blur'

  const {
    metadata,
    ready,
    registerFailedImage,
    registerLoadedImage,
  } = useGalleryReadiness()

  return (
    <div
      aria-busy={!ready}
      className="shared-gallery-shell"
    >
      {!ready
        ? (
          <div className="shared-gallery__loading-container">
            <Loader className="shared-gallery__loading-spinner" size={16}/>
            <p
              aria-live="polite"
              className="shared-gallery__loading-label"
              role="status"
            >
              Preparing gallery
            </p>
          </div>
        )
        : null}

      <div
        aria-hidden={!ready}
        className="shared-gallery"
        style={{
          pointerEvents: ready ? undefined : 'none',
          visibility: ready ? 'visible' : 'hidden',
          opacity: ready ? 1 : 0,
          transition: "opacity 750ms ease-in"
        }}
      >
        {posts.map((post, index) => (
          <GalleryPost
            index={index}
            key={post.id}
            metadata={
              metadata.get(post.image)
              ?? imageMetadataCache.get(post.image)
            }
            onImageError={registerFailedImage}
            onImageLoad={registerLoadedImage}
            post={post}
            transition={transition}
          />
        ))}
      </div>
    </div>
  )
}

function RouteB() {
  const location = useLocation()
  const navigate = useRouteveilNavigate()
  const transition = 'blur'

  const postId = new URLSearchParams(location.search).get('post')

  const post = posts.find(
    (candidate) => candidate.id === postId,
  ) ?? posts[0]

  const [returning, setReturning] = useState(false)

  const [metadata, setMetadata] = useState<ImageMetadata | undefined>(
    () => imageMetadataCache.get(post.image),
  )

  useEffect(() => {
    let cancelled = false

    void prepareImage(post.image).then((nextMetadata) => {
      if (!cancelled) {
        setMetadata(nextMetadata)
      }
    })

    void prepareImage(post.avatar)
    void prepareGalleryAssets()

    return () => {
      cancelled = true
    }
  }, [post.avatar, post.image])

  const handleDetailImageLoad = (
    event: SyntheticEvent<HTMLImageElement>,
  ) => {
    const nextMetadata = cacheImageMetadata(
      post.image,
      event.currentTarget,
    )

    if (nextMetadata) {
      setMetadata(nextMetadata)
    }
  }

  const navigateBack = async () => {
    if (returning) {
      return
    }

    setReturning(true)

    await prepareGalleryAssets()

    void navigate('/lab/shared-elements', {
      preventScrollReset: true,
      scrollToSharedElement: `${post.id}-image`,
      transition,
      sharedElements: `${post.id}-image`
    })
  }

  return (
    <article className="shared-gallery-detail">
      <button
        aria-busy={returning}
        aria-label="Back to image gallery"
        className="shared-gallery-detail__back"
        disabled={returning}
        onClick={() => {
          void navigateBack()
        }}
        type="button"
      >
        <ArrowLeft aria-hidden="true" strokeWidth={2} />
      </button>

      <RouteveilSharedElement name={`${post.id}-image`}>
        <img
          alt={getPostImageAlt(post)}
          className="shared-gallery-detail__image"
          decoding="sync"
          draggable={false}
          fetchPriority="high"
          height={metadata?.height}
          loading="eager"
          onLoad={handleDetailImageLoad}
          src={post.image}
          width={metadata?.width}
        />
      </RouteveilSharedElement>

      <div className="shared-gallery-detail__author">
        <img
          alt=""
          className="shared-gallery-detail__avatar"
          decoding="async"
          loading="eager"
          src={post.avatar}
        />

        <div className="shared-gallery-detail__author-text">
          <p className="shared-gallery-detail__author-name">
            {post.author}
          </p>

          <p className="shared-gallery-detail__username">
            @{post.username}
          </p>
        </div>
      </div>

      {post.title
        ? (
          <h2 className="shared-gallery-detail__title">
            {post.title}
          </h2>
        )
        : null}
    </article>
  )
}

function SharedElementsRoute({
  detail,
}: {
  detail: boolean
}) {
  return (
    <>
      <main className="page lab-page shared-elements-demo">
        <header className="lab-hero page-frame">
          <div className="lab-hero__heading-mask">
            <div className="lab-hero__heading-reveal">
              <PixelHeadingWord
                as="h1"
                initialFont="square"
                hoverFont="square"
              >
                Shared Elements
              </PixelHeadingWord>
            </div>
          </div>

          <div className="lab-hero__description-mask">
            <div className="lab-hero__description-reveal">
              <p className="lab-hero__description">
                Shared elements stay visible between routes while the page
                transition completes around them. Try the gallery below, or
                learn more about{' '}
                <a
                  className="shared-elements-demo__text-link"
                  href="/docs#shared-elements"
                >
                  shared elements
                </a>
                .
              </p>
            </div>
          </div>
        </header>

        <div className="page-frame shared-elements-demo__workbench">
          <section className="lab-group">
            <header className="lab-workbench lab-group__header">
              <div className="lab-group__title">
                <span>{detail ? '02' : '01'}</span>

                <PixelHeadingWord
                  as="h2"
                  initialFont="square"
                  hoverFont="square"
                >
                  {detail ? 'Route B' : 'Route A'}
                </PixelHeadingWord>
              </div>

              <p>
                {detail
                  ? 'The same named elements are now the outgoing sources.'
                  : 'The shared element will morph into the new route and take on the incoming position.'}
              </p>
            </header>

            {detail ? <RouteB /> : <RouteA />}
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}

export function SharedElementsDemoPage() {
  return <SharedElementsRoute detail={false} />
}

export function SharedElementsDetailPage() {
  return <SharedElementsRoute detail />
}