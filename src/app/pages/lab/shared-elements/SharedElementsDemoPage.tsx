import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  RouteveilLink,
  RouteveilSharedElement,
  useRouteveilNavigate,
} from '../../../../react-router'
import { Footer } from '../../../shared/UI/Footer'
import { PixelHeadingWord } from '../../../shared/UI'

const assetRoot = '/shared-elements-pinterest-mock'
const pinterestCard1 = `${assetRoot}/1.jpg`
const pinterestCard2 = `${assetRoot}/2.jpg`
const pinterestCard3 = `${assetRoot}/3.jpg`
const pinterestCard4 = `${assetRoot}/4.gif`
const pinterestCard5 = `${assetRoot}/5.jpg`
const pinterestCard6 = `${assetRoot}/6.jpg`
const pinterestCard7 = `${assetRoot}/7.jpg`
const pinterestCard8 = `${assetRoot}/8.gif`
const pinterestCard9 = `${assetRoot}/9.jpg`
const pinterestCard10 = `${assetRoot}/10.gif`
const pinterestCard11 = `${assetRoot}/11.jpg`
const pinterestCard12 = `${assetRoot}/12.jpg`
const pinterestCard13 = `${assetRoot}/13.jpg`
const pinterestCard14 = `${assetRoot}/14.jpg`
const pinterestCard15 = `${assetRoot}/15.gif`
const pinterestCard16 = `${assetRoot}/16.jpg`
const pinterestCard17 = `${assetRoot}/17.jpg`
const pinterestCard18 = `${assetRoot}/18.jpg`
const pinterestCard19 = `${assetRoot}/19.gif`
const pinterestCard20 = `${assetRoot}/20.jpg`
const pinterestCard21 = `${assetRoot}/21.jpg`
const pinterestCard22 = `${assetRoot}/22.jpg`
const pinterestCard23 = `${assetRoot}/23.jpg`
const pinterestCard24 = `${assetRoot}/24.gif`
const pinterestCard25 = `${assetRoot}/25.gif`
const pinterestCard26 = `${assetRoot}/26.jpg`
const pinterestCard27 = `${assetRoot}/27.jpg`
const pinterestCard28 = `${assetRoot}/28.gif`
const pinterestCard29 = `${assetRoot}/29.gif`
const pinterestCard30 = `${assetRoot}/30.gif`
const pinterestCard31 = `${assetRoot}/31.jpg`
const pinterestCard32 = `${assetRoot}/32.jpg`
const pinterestCard33 = `${assetRoot}/33.jpg`
const pinterestCard34 = `${assetRoot}/34.jpg`
const pinterestCard35 = `${assetRoot}/35.jpg`
const pinterestCard36 = `${assetRoot}/36.gif`
const pinterestCard37 = `${assetRoot}/37.gif`
const pinterestCard38 = `${assetRoot}/38.jpg`
const pinterestCard39 = `${assetRoot}/39.gif`
const pinterestCard40 = `${assetRoot}/40.gif`
const avatar1 = `${assetRoot}/avatars/1.jpg`
const avatar2 = `${assetRoot}/avatars/2.jpg`
const avatar3 = `${assetRoot}/avatars/3.jpg`
const avatar4 = `${assetRoot}/avatars/4.jpg`
const avatar5 = `${assetRoot}/avatars/5.jpg`
const avatar6 = `${assetRoot}/avatars/6.jpg`
const avatar7 = `${assetRoot}/avatars/7.jpg`
const avatar8 = `${assetRoot}/avatars/8.jpg`
const avatar10 = `${assetRoot}/avatars/10.jpg`
const avatar11 = `${assetRoot}/avatars/11.jpg`
const avatar12 = `${assetRoot}/avatars/12.jpg`
const avatar13 = `${assetRoot}/avatars/13.jpg`
const avatar14 = `${assetRoot}/avatars/14.jpg`
const avatar15 = `${assetRoot}/avatars/15.jpg`
const avatar16 = `${assetRoot}/avatars/16.jpg`
const avatar17 = `${assetRoot}/avatars/17.jpg`
const avatar18 = `${assetRoot}/avatars/18.jpg`
const avatar19 = `${assetRoot}/avatars/19.jpg`
const avatar20 = `${assetRoot}/avatars/20.jpg`
const avatar21 = `${assetRoot}/avatars/21.jpg`
const avatar22 = `${assetRoot}/avatars/22.jpg`
const avatar23 = `${assetRoot}/avatars/23.jpg`
const avatar24 = `${assetRoot}/avatars/24.jpg`
const avatar25 = `${assetRoot}/avatars/25.jpg`
const avatar26 = `${assetRoot}/avatars/26.jpg`
const avatar27 = `${assetRoot}/avatars/27.jpg`
const avatar28 = `${assetRoot}/avatars/28.jpg`
const avatar29 = `${assetRoot}/avatars/29.jpg`
const avatar30 = `${assetRoot}/avatars/30.jpg`
const avatar31 = `${assetRoot}/avatars/31.jpg`
const avatar32 = `${assetRoot}/avatars/32.jpg`
const avatar33 = `${assetRoot}/avatars/33.jpg`
const avatar34 = `${assetRoot}/avatars/34.webp`

import '../lab.css'
import './shared-elements.css'

const posts = [
  {
    id: '1',
    title: 'Everyone Is Dead in Neon',
    image: pinterestCard1,
    author: 'Nora Bloom',
    username: 'norabloom',
    avatar: avatar1,
  },
  {
    id: '2',
    title: 'Leopard Repetition',
    image: pinterestCard2,
    author: 'Mina Kaye',
    username: 'minakaye',
    avatar: avatar2,
  },
  {
    id: '40',
    title: 'Artifact',
    image: pinterestCard40,
    author: 'Leon Ash',
    username: 'leonash',
    avatar: avatar34,
  },
  {
    id: '3',
    title: '',
    image: pinterestCard3,
    author: 'Theo Marsh',
    username: 'theomarsh',
    avatar: avatar3,
  },
  {
    id: '4',
    title: 'Stay for the Splash',
    image: pinterestCard4,
    author: 'June Hollow',
    username: 'junehollow',
    avatar: avatar4,
  },
  {
    id: '5',
    title: '',
    image: pinterestCard5,
    author: 'Sol Mercer',
    username: 'solmercer',
    avatar: avatar5,
  },
  {
    id: '36',
    title: '',
    image: pinterestCard36,
    author: 'Nova King',
    username: 'novaking',
    avatar: avatar34,
  },
  {
    id: '6',
    title: 'Pink Script',
    image: pinterestCard6,
    author: 'Kian Rook',
    username: 'kianrook',
    avatar: avatar6,
  },
  {
    id: '7',
    title: 'Cash in the Gallery',
    image: pinterestCard7,
    author: 'Remy Vale',
    username: 'remyvale',
    avatar: avatar7,
  },
  {
    id: '8',
    title: '',
    image: pinterestCard9,
    author: 'Ellis Rowe',
    username: 'ellisrowe',
    avatar: avatar8,
  },
  {
    id: '10',
    title: 'Pixel Memory',
    image: pinterestCard10,
    author: 'Bea Knox',
    username: 'beaknox',
    avatar: avatar10,
  },
  {
    id: '9',
    title: '',
    image: pinterestCard8,
    author: 'Mara Quinn',
    username: 'maraquinn',
    avatar: avatar34,
  },
  {
    id: '11',
    title: 'The Longest Nap',
    image: pinterestCard11,
    author: 'Luca Grey',
    username: 'lucagrey',
    avatar: avatar11,
  },
  {
    id: '12',
    title: 'Gold Against Gold',
    image: pinterestCard12,
    author: 'Gia Leone',
    username: 'gialeone',
    avatar: avatar12,
  },
  {
    id: '13',
    title: 'Young, Lit, Handsome',
    image: pinterestCard13,
    author: 'Cora Vane',
    username: 'coravane',
    avatar: avatar13,
  },
  {
    id: '14',
    title: 'Pink Leather Study',
    image: pinterestCard14,
    author: 'Inez Cole',
    username: 'inezcole',
    avatar: avatar14,
  },
  {
    id: '15',
    title: '',
    image: pinterestCard15,
    author: 'Nia Hart',
    username: 'niahart',
    avatar: avatar15,
  },
  {
    id: '39',
    title: '',
    image: pinterestCard39,
    author: 'Anya Cove',
    username: 'anyacove',
    avatar: avatar34,
  },
  {
    id: '16',
    title: 'Garden Shift',
    image: pinterestCard16,
    author: 'Oren Pike',
    username: 'orenpike',
    avatar: avatar16,
  },
  {
    id: '17',
    title: 'After-Hours Lawn Club',
    image: pinterestCard17,
    author: 'Alma Frost',
    username: 'almafrost',
    avatar: avatar17,
  },
  {
    id: '18',
    title: 'Three Horses and a Witness',
    image: pinterestCard18,
    author: 'Felix Ward',
    username: 'felixward',
    avatar: avatar18,
  },
  {
    id: '20',
    title: 'Tutto Passa',
    image: pinterestCard20,
    author: 'Hugo Lane',
    username: 'hugolane',
    avatar: avatar20,
  },
  {
    id: '30',
    title: 'Accordion in the Ruins',
    image: pinterestCard30,
    author: 'Jude Cross',
    username: 'judecross',
    avatar: avatar30,
  },
  {
    id: '21',
    title: '',
    image: pinterestCard21,
    author: 'Cleo Banks',
    username: 'cleobanks',
    avatar: avatar21,
  },
  {
    id: '22',
    title: 'Diamond Smile',
    image: pinterestCard22,
    author: 'Milo Stone',
    username: 'milostone',
    avatar: avatar22,
  },
  {
    id: '23',
    title: '',
    image: pinterestCard23,
    author: 'Esme Reed',
    username: 'esmereed',
    avatar: avatar23,
  },
  {
    id: '24',
    title: 'P@P',
    image: pinterestCard24,
    author: 'Arlo Finch',
    username: 'arlofinch',
    avatar: avatar24,
  },
  {
    id: '25',
    title: '',
    image: pinterestCard25,
    author: 'Lyra West',
    username: 'lyrawest',
    avatar: avatar25,
  },
  {
    id: '19',
    title: '',
    image: pinterestCard19,
    author: 'Tessa Moon',
    username: 'tessamoon',
    avatar: avatar19,
  },
  {
    id: '26',
    title: '',
    image: pinterestCard26,
    author: 'Otis Crane',
    username: 'otiscrane',
    avatar: avatar26,
  },
  {
    id: '27',
    title: '',
    image: pinterestCard27,
    author: 'Iris North',
    username: 'irisnorth',
    avatar: avatar27,
  },
  {
    id: '29',
    title: 'Concrete',
    image: pinterestCard28,
    author: 'Vera Snow',
    username: 'verasnow',
    avatar: avatar29,
  },
  {
    id: '31',
    title: '',
    image: pinterestCard31,
    author: 'Eden Shaw',
    username: 'edenshaw',
    avatar: avatar31,
  },
  {
    id: '32',
    title: 'Lotus Prayer',
    image: pinterestCard32,
    author: 'Nico Vale',
    username: 'nicovale',
    avatar: avatar32,
  },
  {
    id: '33',
    title: 'Lethal Blonde',
    image: pinterestCard33,
    author: 'Zola Wynn',
    username: 'zolawynn',
    avatar: avatar33,
  },
  {
    id: '28',
    title: '',
    image: pinterestCard29,
    author: 'Enzo Lake',
    username: 'enzolake',
    avatar: avatar28,
  },
  {
    id: '34',
    title: 'Queen B',
    image: pinterestCard34,
    author: 'Ayla Rose',
    username: 'aylarose',
    avatar: avatar34,
  },
  {
    id: '35',
    title: 'Pink',
    image: pinterestCard35,
    author: 'Rafi Dune',
    username: 'rafidune',
    avatar: avatar34,
  },
  {
    id: '37',
    title: '',
    image: pinterestCard37,
    author: 'Elio Moss',
    username: 'eliomoss',
    avatar: avatar34,
  },
  {
    id: '38',
    title: 'White Light at Low Tide',
    image: pinterestCard38,
    author: 'Sora Bell',
    username: 'sorabell',
    avatar: avatar34,
  },
] as const

function getPostImageAlt(post: typeof posts[number]): string {
  return post.title
    ? `${post.title} by ${post.author}`
    : `Untitled post ${post.id} by ${post.author}`
}

function RouteA() {
  return (
    <div className="shared-gallery">
      {posts.map((post) => (
        <RouteveilLink
          aria-label={post.title
            ? `View ${post.title}`
            : `View untitled post ${post.id}`}
          className="shared-gallery__post"
          key={post.id}
          preventScrollReset
          scrollToSharedElement={`${post.id}-image`}
          to={`/lab/shared-elements/detail?post=${post.id}`}
          transition="blur"
        >
          <RouteveilSharedElement name={`${post.id}-image`}>
            <img
              alt={getPostImageAlt(post)}
              className="shared-gallery__image"
              loading="lazy"
              src={post.image}
            />
          </RouteveilSharedElement>

          <div className="shared-gallery__caption">
            {post.title
              ? <h3 className="shared-gallery__title">{post.title}</h3>
              : null}
            <ArrowUpRight
              aria-hidden="true"
              className="shared-gallery__arrow"
              strokeWidth={2}
            />
          </div>
        </RouteveilLink>
      ))}
    </div>
  )
}

function RouteB() {
  const location = useLocation()
  const navigate = useRouteveilNavigate()
  const postId = new URLSearchParams(location.search).get('post')
  const post = posts.find(
    (candidate) => candidate.id === postId,
  ) ?? posts[0]

  const navigateBack = () => {
    void navigate('/lab/shared-elements', {
      preventScrollReset: true,
      scrollToSharedElement: `${post.id}-image`,
      transition: 'blur',
    })
  }

  return (
    <article className="shared-gallery-detail">
      <button
        aria-label="Back to image gallery"
        className="shared-gallery-detail__back"
        onClick={navigateBack}
        type="button"
      >
        <ArrowLeft aria-hidden="true" strokeWidth={2} />
      </button>

      <RouteveilSharedElement name={`${post.id}-image`}>
        <img
          alt={getPostImageAlt(post)}
          className="shared-gallery-detail__image"
          src={post.image}
        />
      </RouteveilSharedElement>

      <div className="shared-gallery-detail__author">
        <img
          alt=""
          className="shared-gallery-detail__avatar"
          src={post.avatar}
        />
        <div className="shared-gallery-detail__author-text">
          <p className="shared-gallery-detail__author-name">{post.author}</p>
          <p className="shared-gallery-detail__username">@{post.username}</p>
        </div>
      </div>

      {post.title
        ? <h2 className="shared-gallery-detail__title">{post.title}</h2>
        : null}
    </article>
  )
}

function SharedElementsRoute({ detail }: { detail: boolean }) {
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
                Shared elements stay visible between routes while the page transition
                completes around them. Try the gallery below, or learn more about{' '}
                <a
                  className="shared-elements-demo__text-link"
                  href="/docs#shared-elements"
                >
                  shared elements
                </a>.
              </p>
            </div>
          </div>
        </header>

        <div className="lab-workbench page-frame shared-elements-demo__workbench">
          <section className="lab-group">
            <header className="lab-group__header">
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
